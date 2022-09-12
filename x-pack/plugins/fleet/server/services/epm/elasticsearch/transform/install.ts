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

import { installComponentAndIndexTemplateForDataStream } from '../template/install';
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
} from '../../../../../common/types/models';
import { getInstallation } from '../../packages';
import { retryTransientEsErrors } from '../retry';

import { mergeIndexTemplateWithMappings } from './merge_index_template_mappings';
import { deleteTransforms } from './remove';
import { getAsset } from './common';

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

export const installLegacyTransforms = async (
  installablePackage: InstallablePackage,
  paths: string[],
  esClient: ElasticsearchClient,
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger,
  esReferences?: EsAssetReference[]
) => {
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
      logger.info(
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
  const transformPaths = paths.filter((path) => isTransform(path));
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

export const installTransforms = async (
  installablePackage: InstallablePackage,
  paths: string[],
  esClient: ElasticsearchClient,
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger,
  esReferences?: EsAssetReference[]
) => {
  const transformPaths = paths.filter((path) => isTransform(path));
  // If package contains legacy transform specifications (i.e. with json instead of yml)
  if (transformPaths.some((p) => p.endsWith('.json'))) {
    return await installLegacyTransforms(
      installablePackage,
      paths,
      esClient,
      savedObjectsClient,
      logger,
      esReferences
    );
  }

  // Assuming the package will only contain .yml specifications
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
      logger.info(
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
  let installedTransforms: EsAssetReference[] = [];
  if (transformPaths.length > 0) {
    const transformsSpecifications = new Map();
    const destinationIndexTemplates: DestinationIndexTemplateInstallation[] = [];
    const indices = [];
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

      if (fileName === 'fields') {
        const validFields = processFields(content);
        const mappings = generateMappings(validFields);
        packageAssets?.set('mappings', mappings);
      }

      if (fileName === 'transform') {
        transformsSpecifications.get(transformModuleId)?.set('destinationIndex', content.dest);
        indices.push(content.dest);
        transformsSpecifications.get(transformModuleId)?.set('transform', content);
        content._meta = getESAssetMetadata({ packageName: installablePackage.name });
        transforms.push({
          transformModuleId,
          installationName: getTransformNameForInstallation(
            installablePackage,
            transformModuleId,
            installNameSuffix
          ),
          content,
        });
        indices.push(content.dest);
      }

      if (fileName === 'manifest') {
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
            installationName: getTransformNameForInstallation(
              installablePackage,
              transformModuleId,
              installNameSuffix,
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

    const transformRefs = transforms.map((t) => ({
      id: t.installationName,
      type: ElasticsearchAssetType.transform,
    }));

    // get and save refs associated with the transforms before installing
    esReferences = await updateEsAssetReferences(
      savedObjectsClient,
      installablePackage.name,
      esReferences,
      {
        assetsToAdd: [...indexTemplatesRefs, ...transformRefs],
        assetsToRemove: previousInstalledTransformEsAssets,
      }
    );

    await Promise.all(
      destinationIndexTemplates
        .map((destinationIndexTemplate) => {
          const mergedTemplate = mergeIndexTemplateWithMappings(
            destinationIndexTemplate.template,
            transformsSpecifications
              .get(destinationIndexTemplate.transformModuleId)
              ?.get('mappings')
          );
          if (mergedTemplate !== undefined) {
            return installComponentAndIndexTemplateForDataStream({
              esClient,
              logger,
              componentTemplates: {},
              indexTemplate: {
                templateName: destinationIndexTemplate.installationName,
                // @ts-expect-error Index template here should not contain data_stream property
                // as this template is applied to only an index and not a data stream
                indexTemplate: {
                  template: mergedTemplate,
                  priority: 250,
                  index_patterns: [
                    transformsSpecifications
                      .get(destinationIndexTemplate.transformModuleId)
                      ?.get('destinationIndex').index,
                  ],
                  _meta: destinationIndexTemplate._meta,
                  composed_of: [],
                },
              },
            });
          }
        })
        .filter((p) => p !== undefined)
    );
    await Promise.all(
      transforms.map(async (transform) => {
        const index = transform.content.dest.index;
        const pipelineId = transform.content.dest.pipeline;

        const indexExist = await esClient.indices.exists({
          index,
        });
        if (indexExist !== true) {
          return esClient.indices.create({
            index,
            ...(pipelineId ? { settings: { default_pipeline: pipelineId } } : {}),
          });
        }
      })
    );

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

const getTransformNameForInstallation = (
  installablePackage: InstallablePackage,
  transformModuleId: string,
  suffix: string,
  assetType?: string
) => {
  return `logs-${installablePackage.name}.${transformModuleId}-${
    assetType === undefined ? 'default' : assetType
  }-${suffix}`;
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
