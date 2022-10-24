/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';
import { safeLoad } from 'js-yaml';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import {
  PACKAGE_TEMPLATE_SUFFIX,
  USER_SETTINGS_TEMPLATE_SUFFIX,
} from '../../../../../common/constants';
import {
  buildComponentTemplates,
  installComponentAndIndexTemplateForDataStream,
} from '../template/install';
import { processFields } from '../../fields/field';
import { generateMappings } from '../template/template';
import { getESAssetMetadata } from '../meta';
import { updateEsAssetReferences } from '../../packages/install';
import { getPathParts } from '../../archive';
import { ElasticsearchAssetType } from '../../../../../common/types/models';
import type {
  EsAssetReference,
  InstallablePackage,
  ESAssetMetadata,
  IndexTemplate,
  RegistryElasticsearch,
} from '../../../../../common/types/models';
import { getInstallation } from '../../packages';
import { retryTransientEsErrors } from '../retry';

import { deleteTransforms } from './remove';
import { getAsset } from './common';

const DEFAULT_TRANSFORM_TEMPLATES_PRIORITY = 250;
enum TRANSFORM_SPECS_TYPES {
  MANIFEST = 'manifest',
  FIELDS = 'fields',
  TRANSFORM = 'transform',
}

interface TransformModuleBase {
  transformModuleId?: string;
}
interface DestinationIndexTemplateInstallation extends TransformModuleBase {
  installationName: string;
  _meta: ESAssetMetadata;
  template: IndexTemplate['template'];
}
interface TransformInstallation extends TransformModuleBase {
  installationName: string;
  content: any;
}

const installLegacyTransformsAssets = async (
  installablePackage: InstallablePackage,
  installNameSuffix: string,
  transformPaths: string[],
  esClient: ElasticsearchClient,
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger,
  esReferences: EsAssetReference[] = [],
  previousInstalledTransformEsAssets: EsAssetReference[] = []
) => {
  let installedTransforms: EsAssetReference[] = [];
  if (transformPaths.length > 0) {
    const transformRefs = transformPaths.reduce<EsAssetReference[]>((acc, path) => {
      acc.push({
        id: getLegacyTransformNameForInstallation(installablePackage, path, installNameSuffix),
        type: ElasticsearchAssetType.transform,
      });

      return acc;
    }, []);

    // get and save transform refs before installing transforms
    esReferences = await updateEsAssetReferences(
      savedObjectsClient,
      installablePackage.name,
      esReferences,
      {
        assetsToAdd: transformRefs,
      }
    );

    const transforms: TransformInstallation[] = transformPaths.map((path: string) => {
      const content = JSON.parse(getAsset(path).toString('utf-8'));
      content._meta = getESAssetMetadata({ packageName: installablePackage.name });

      return {
        installationName: getLegacyTransformNameForInstallation(
          installablePackage,
          path,
          installNameSuffix
        ),
        content,
      };
    });

    const installationPromises = transforms.map(async (transform) => {
      return handleTransformInstall({ esClient, logger, transform });
    });

    installedTransforms = await Promise.all(installationPromises).then((results) => results.flat());
  }

  if (previousInstalledTransformEsAssets.length > 0) {
    esReferences = await updateEsAssetReferences(
      savedObjectsClient,
      installablePackage.name,
      esReferences,
      {
        assetsToRemove: previousInstalledTransformEsAssets,
      }
    );
  }

  return { installedTransforms, esReferences };
};

const processTransformAssetsPerModule = (
  installablePackage: InstallablePackage,
  installNameSuffix: string,
  transformPaths: string[]
) => {
  const transformsSpecifications = new Map();
  const destinationIndexTemplates: DestinationIndexTemplateInstallation[] = [];
  const transforms: TransformInstallation[] = [];

  transformPaths.forEach((path: string) => {
    const { transformModuleId, fileName } = getTransformFolderAndFileNames(
      installablePackage,
      path
    );

    // Since there can be multiple assets per transform definition
    // We want to create a unique list of assets/specifications for each transform
    if (transformsSpecifications.get(transformModuleId) === undefined) {
      transformsSpecifications.set(transformModuleId, new Map());
    }
    const packageAssets = transformsSpecifications.get(transformModuleId);

    const content = safeLoad(getAsset(path).toString('utf-8'));

    if (fileName === TRANSFORM_SPECS_TYPES.FIELDS) {
      const validFields = processFields(content);
      const mappings = generateMappings(validFields);
      packageAssets?.set('mappings', mappings);
    }

    if (fileName === TRANSFORM_SPECS_TYPES.TRANSFORM) {
      transformsSpecifications.get(transformModuleId)?.set('destinationIndex', content.dest);
      transformsSpecifications.get(transformModuleId)?.set('transform', content);
      content._meta = getESAssetMetadata({ packageName: installablePackage.name });
      transforms.push({
        transformModuleId,
        installationName: getTransformAssetNameForInstallation(
          installablePackage,
          transformModuleId,
          `default-${installNameSuffix}`
        ),
        content,
      });
    }

    if (fileName === TRANSFORM_SPECS_TYPES.MANIFEST) {
      if (isPopulatedObject(content, ['start']) && content.start === false) {
        transformsSpecifications.get(transformModuleId)?.set('start', false);
      }
      // If manifest.yml contains destination_index_template
      // Combine the mappings and other index template settings from manifest.yml into a single index template
      // Create the index template and track the template in EsAssetReferences
      if (
        isPopulatedObject(content, ['destination_index_template']) ||
        isPopulatedObject(packageAssets.get('mappings'))
      ) {
        const destinationIndexTemplate =
          (content.destination_index_template as Record<string, unknown>) ?? {};
        destinationIndexTemplates.push({
          transformModuleId,
          _meta: getESAssetMetadata({ packageName: installablePackage.name }),
          installationName: getTransformAssetNameForInstallation(
            installablePackage,
            transformModuleId,
            'template'
          ),
          template: destinationIndexTemplate,
        } as DestinationIndexTemplateInstallation);
        packageAssets.set('destinationIndexTemplate', destinationIndexTemplate);
      }
    }
  });

  const indexTemplatesRefs = destinationIndexTemplates.map((template) => ({
    id: template.installationName,
    type: ElasticsearchAssetType.indexTemplate,
  }));
  const componentTemplatesRefs = [
    ...destinationIndexTemplates.map((template) => ({
      id: `${template.installationName}${USER_SETTINGS_TEMPLATE_SUFFIX}`,
      type: ElasticsearchAssetType.componentTemplate,
    })),
    ...destinationIndexTemplates.map((template) => ({
      id: `${template.installationName}${PACKAGE_TEMPLATE_SUFFIX}`,
      type: ElasticsearchAssetType.componentTemplate,
    })),
  ];

  const transformRefs = transforms.map((t) => ({
    id: t.installationName,
    type: ElasticsearchAssetType.transform,
  }));

  return {
    indexTemplatesRefs,
    componentTemplatesRefs,
    transformRefs,
    transforms,
    destinationIndexTemplates,
    transformsSpecifications,
  };
};

const installTransformsAssets = async (
  installablePackage: InstallablePackage,
  installNameSuffix: string,
  transformPaths: string[],
  esClient: ElasticsearchClient,
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger,
  esReferences: EsAssetReference[] = [],
  previousInstalledTransformEsAssets: EsAssetReference[] = []
) => {
  let installedTransforms: EsAssetReference[] = [];
  if (transformPaths.length > 0) {
    const {
      indexTemplatesRefs,
      componentTemplatesRefs,
      transformRefs,
      transforms,
      destinationIndexTemplates,
      transformsSpecifications,
    } = processTransformAssetsPerModule(installablePackage, installNameSuffix, transformPaths);
    // get and save refs associated with the transforms before installing
    esReferences = await updateEsAssetReferences(
      savedObjectsClient,
      installablePackage.name,
      esReferences,
      {
        assetsToAdd: [...indexTemplatesRefs, ...componentTemplatesRefs, ...transformRefs],
        assetsToRemove: previousInstalledTransformEsAssets,
      }
    );

    // create index templates and component templates
    await Promise.all(
      destinationIndexTemplates
        .map((destinationIndexTemplate) => {
          const customMappings =
            transformsSpecifications
              .get(destinationIndexTemplate.transformModuleId)
              ?.get('mappings') ?? {};
          const registryElasticsearch: RegistryElasticsearch = {
            'index_template.settings': destinationIndexTemplate.template.settings,
            'index_template.mappings': destinationIndexTemplate.template.mappings,
          };

          const componentTemplates = buildComponentTemplates({
            mappings: customMappings,
            templateName: destinationIndexTemplate.installationName,
            registryElasticsearch,
            packageName: installablePackage.name,
            defaultSettings: {},
          });

          if (destinationIndexTemplate || customMappings) {
            return installComponentAndIndexTemplateForDataStream({
              esClient,
              logger,
              componentTemplates,
              indexTemplate: {
                templateName: destinationIndexTemplate.installationName,
                // @ts-expect-error We don't need to pass data_stream property here
                // as this template is applied to only an index and not a data stream
                indexTemplate: {
                  template: { settings: undefined, mappings: undefined },
                  priority: DEFAULT_TRANSFORM_TEMPLATES_PRIORITY,
                  index_patterns: [
                    transformsSpecifications
                      .get(destinationIndexTemplate.transformModuleId)
                      ?.get('destinationIndex').index,
                  ],
                  _meta: destinationIndexTemplate._meta,
                  composed_of: Object.keys(componentTemplates),
                },
              },
            });
          }
        })
        .filter((p) => p !== undefined)
    );

    // create destination indices
    await Promise.all(
      transforms.map(async (transform) => {
        const index = transform.content.dest.index;
        const pipelineId = transform.content.dest.pipeline;

        try {
          await retryTransientEsErrors(
            () =>
              esClient.indices.create(
                {
                  index,
                  ...(pipelineId ? { settings: { default_pipeline: pipelineId } } : {}),
                },
                { ignore: [400] }
              ),
            { logger }
          );
        } catch (err) {
          throw new Error(err.message);
        }
      })
    );

    // create & optionally start transforms
    const transformsPromises = transforms.map(async (transform) => {
      return handleTransformInstall({
        esClient,
        logger,
        transform,
        startTransform: transformsSpecifications.get(transform.transformModuleId)?.get('start'),
      });
    });

    installedTransforms = await Promise.all(transformsPromises).then((results) => results.flat());
  }

  return { installedTransforms, esReferences };
};
export const installTransforms = async (
  installablePackage: InstallablePackage,
  paths: string[],
  esClient: ElasticsearchClient,
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger,
  esReferences?: EsAssetReference[]
) => {
  const transformPaths = paths.filter((path) => isTransform(path));

  const installation = await getInstallation({
    savedObjectsClient,
    pkgName: installablePackage.name,
  });
  esReferences = esReferences ?? installation?.installed_es ?? [];
  let previousInstalledTransformEsAssets: EsAssetReference[] = [];
  if (installation) {
    previousInstalledTransformEsAssets = installation.installed_es.filter(
      ({ type, id }) => type === ElasticsearchAssetType.transform
    );
    if (previousInstalledTransformEsAssets.length) {
      logger.debug(
        `Found previous transform references:\n ${JSON.stringify(
          previousInstalledTransformEsAssets
        )}`
      );
    }
  }

  // delete all previous transform
  await deleteTransforms(
    esClient,
    previousInstalledTransformEsAssets.map((asset) => asset.id)
  );

  const installNameSuffix = `${installablePackage.version}`;

  // If package contains legacy transform specifications (i.e. with json instead of yml)
  if (transformPaths.some((p) => p.endsWith('.json')) || transformPaths.length === 0) {
    return await installLegacyTransformsAssets(
      installablePackage,
      installNameSuffix,
      transformPaths,
      esClient,
      savedObjectsClient,
      logger,
      esReferences,
      previousInstalledTransformEsAssets
    );
  }

  return await installTransformsAssets(
    installablePackage,
    installNameSuffix,
    transformPaths,
    esClient,
    savedObjectsClient,
    logger,
    esReferences,
    previousInstalledTransformEsAssets
  );
};

export const isTransform = (path: string) => {
  const pathParts = getPathParts(path);
  return !path.endsWith('/') && pathParts.type === ElasticsearchAssetType.transform;
};

async function handleTransformInstall({
  esClient,
  logger,
  transform,
  startTransform,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  transform: TransformInstallation;
  startTransform?: boolean;
}): Promise<EsAssetReference> {
  try {
    await retryTransientEsErrors(
      () =>
        // defer validation on put if the source index is not available
        esClient.transform.putTransform({
          transform_id: transform.installationName,
          defer_validation: true,
          body: transform.content,
        }),
      { logger }
    );
  } catch (err) {
    // swallow the error if the transform already exists.
    const isAlreadyExistError =
      err instanceof errors.ResponseError &&
      err?.body?.error?.type === 'resource_already_exists_exception';
    if (!isAlreadyExistError) {
      throw err;
    }
  }

  // start transform by default if not set in yml file
  // else, respect the setting
  if (startTransform === undefined || startTransform === true) {
    await esClient.transform.startTransform(
      { transform_id: transform.installationName },
      { ignore: [409] }
    );
    logger.debug(`Started transform: ${transform.installationName}`);
  }

  return { id: transform.installationName, type: ElasticsearchAssetType.transform };
}

const getLegacyTransformNameForInstallation = (
  installablePackage: InstallablePackage,
  path: string,
  suffix: string
) => {
  const pathPaths = path.split('/');
  const filename = pathPaths?.pop()?.split('.')[0];
  const folderName = pathPaths?.pop();
  return `${installablePackage.name}.${folderName}-${filename}-${suffix}`;
};

const getTransformAssetNameForInstallation = (
  installablePackage: InstallablePackage,
  transformModuleId: string,
  suffix?: string
) => {
  return `logs-${installablePackage.name}.${transformModuleId}${suffix ? '-' + suffix : ''}`;
};

const getTransformFolderAndFileNames = (installablePackage: InstallablePackage, path: string) => {
  const pathPaths = path.split('/');
  const fileName = pathPaths?.pop()?.split('.')[0];
  let transformModuleId = pathPaths?.pop();

  // If fields.yml is located inside a directory called 'fields' (e.g. {exampleFolder}/fields/fields.yml)
  // We need to go one level up to get the real folder name
  if (transformModuleId === 'fields') {
    transformModuleId = pathPaths?.pop();
  }
  return { fileName: fileName ?? '', transformModuleId: transformModuleId ?? '' };
};
