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
import { uniqBy } from 'lodash';

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
import { getAsset, TRANSFORM_DEST_IDX_ALIAS_LATEST_SFX } from './common';

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
  transformVersion?: string;
  installationOrder?: number;
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
  await deleteTransforms(
    esClient,
    previousInstalledTransformEsAssets.map((asset) => asset.id),
    // For legacy transforms, delete destination indices upon deleting transforms
    true
  );

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
  transformPaths: string[],
  previousInstalledTransformEsAssets: EsAssetReference[] = []
) => {
  const transformsSpecifications = new Map();
  const destinationIndexTemplates: DestinationIndexTemplateInstallation[] = [];
  const transforms: TransformInstallation[] = [];
  const aliasesRefs: string[] = [];
  const transformsToRemove: EsAssetReference[] = [];
  const transformsToRemoveWithDestIndex: EsAssetReference[] = [];
  const indicesToAddRefs: EsAssetReference[] = [];

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
      const templateName = getTransformAssetNameForInstallation(
        installablePackage,
        transformModuleId,
        'template'
      );
      const indexToModify = destinationIndexTemplates.findIndex(
        (t) => t.transformModuleId === transformModuleId && t.installationName === templateName
      );
      const template = {
        transformModuleId,
        _meta: getESAssetMetadata({ packageName: installablePackage.name }),
        installationName: getTransformAssetNameForInstallation(
          installablePackage,
          transformModuleId,
          'template'
        ),
        template: {},
      } as DestinationIndexTemplateInstallation;
      if (indexToModify === -1) {
        destinationIndexTemplates.push(template);
      } else {
        destinationIndexTemplates[indexToModify] = template;
      }
      packageAssets?.set('mappings', mappings);
    }

    if (fileName === TRANSFORM_SPECS_TYPES.TRANSFORM) {
      const installationOrder =
        isFinite(content._meta?.order) && content._meta?.order >= 0 ? content._meta?.order : 0;
      const transformVersion = content._meta?.fleet_transform_version ?? '0.1.0';
      // The “all” alias for the transform destination indices will be adjusted to include the new transform destination index as well as everything it previously included
      const allIndexAliasName = `${content.dest.index}.all`;
      // The “latest” alias for the transform destination indices will point solely to the new transform destination index
      const latestIndexAliasName = `${content.dest.index}.latest`;

      transformsSpecifications
        .get(transformModuleId)
        ?.set('originalDestinationIndexName', content.dest.index);

      // Create two aliases associated with the destination index
      // for better handling during upgrades
      const alias = {
        [allIndexAliasName]: {},
        [latestIndexAliasName]: {},
      };

      const versionedIndexName = `${content.dest.index}-${installNameSuffix}`;
      content.dest.index = versionedIndexName;
      indicesToAddRefs.push({
        id: versionedIndexName,
        type: ElasticsearchAssetType.index,
      });
      transformsSpecifications.get(transformModuleId)?.set('destinationIndex', content.dest);
      transformsSpecifications.get(transformModuleId)?.set('destinationIndexAlias', alias);
      transformsSpecifications.get(transformModuleId)?.set('transform', content);
      transformsSpecifications.get(transformModuleId)?.set('transformVersion', transformVersion);
      content._meta = {
        ...(content._meta ?? {}),
        ...getESAssetMetadata({ packageName: installablePackage.name }),
      };

      const installationName = getTransformAssetNameForInstallation(
        installablePackage,
        transformModuleId,
        // transform_id is versioned by fleet_transform_version and not by package version
        `default-${transformVersion}`
      );

      const currentTransformSameAsPrev =
        previousInstalledTransformEsAssets.find((t) => t.id === installationName) !== undefined;
      if (previousInstalledTransformEsAssets.length === 0) {
        aliasesRefs.push(allIndexAliasName, latestIndexAliasName);
        transforms.push({
          transformModuleId,
          installationName,
          installationOrder,
          transformVersion,
          content,
        });
        transformsSpecifications.get(transformModuleId)?.set('transformVersionChanged', true);
      } else {
        if (!currentTransformSameAsPrev) {
          // If upgrading from old json schema to new yml schema
          // We need to make sure to delete those transforms by matching the legacy naming convention
          const versionFromOldJsonSchema = previousInstalledTransformEsAssets.find((t) =>
            t.id.startsWith(
              getLegacyTransformNameForInstallation(
                installablePackage,
                `${transformModuleId}/default.json`
              )
            )
          );

          if (versionFromOldJsonSchema !== undefined) {
            transformsToRemoveWithDestIndex.push(versionFromOldJsonSchema);
          }

          // If upgrading from yml to newer version of yaml
          // Match using new naming convention
          const installNameWithoutVersion = installationName.split(transformVersion)[0];
          const prevVersion = previousInstalledTransformEsAssets.find((t) =>
            t.id.startsWith(installNameWithoutVersion)
          );
          if (prevVersion !== undefined) {
            transformsToRemove.push(prevVersion);
          }
          transforms.push({
            transformModuleId,
            installationName,
            installationOrder,
            transformVersion,
            content,
          });
          transformsSpecifications.get(transformModuleId)?.set('transformVersionChanged', true);
          aliasesRefs.push(allIndexAliasName, latestIndexAliasName);
        } else {
          transformsSpecifications.get(transformModuleId)?.set('transformVersionChanged', false);
        }
      }
    }

    // Create index templates for destination indices if destination_index_template OR fields are defined
    if (fileName === TRANSFORM_SPECS_TYPES.MANIFEST) {
      if (isPopulatedObject(content, ['start']) && content.start === false) {
        transformsSpecifications.get(transformModuleId)?.set('start', false);
      }

      if (content.destination_index_template) {
        const templateName = getTransformAssetNameForInstallation(
          installablePackage,
          transformModuleId,
          'template'
        );
        const indexToModify = destinationIndexTemplates.findIndex(
          (t) => t.transformModuleId === transformModuleId && t.installationName === templateName
        );
        const template = {
          transformModuleId,
          _meta: getESAssetMetadata({ packageName: installablePackage.name }),
          installationName: getTransformAssetNameForInstallation(
            installablePackage,
            transformModuleId,
            'template'
          ),
          template: content.destination_index_template,
        } as DestinationIndexTemplateInstallation;
        if (indexToModify === -1) {
          destinationIndexTemplates.push(template);
        } else {
          destinationIndexTemplates[indexToModify] = template;
        }
        packageAssets.set('destinationIndexTemplate', template);
      }
    }
  });

  const indexTemplatesRefs = destinationIndexTemplates.map((template) => ({
    id: template.installationName,
    type: ElasticsearchAssetType.indexTemplate,
    version: transformsSpecifications.get(template.transformModuleId)?.get('transformVersion'),
  }));
  const componentTemplatesRefs = [
    ...destinationIndexTemplates.map((template) => ({
      id: `${template.installationName}${USER_SETTINGS_TEMPLATE_SUFFIX}`,
      type: ElasticsearchAssetType.componentTemplate,
      version: transformsSpecifications.get(template.transformModuleId)?.get('transformVersion'),
    })),
    ...destinationIndexTemplates.map((template) => ({
      id: `${template.installationName}${PACKAGE_TEMPLATE_SUFFIX}`,
      type: ElasticsearchAssetType.componentTemplate,
      version: transformsSpecifications.get(template.transformModuleId)?.get('transformVersion'),
    })),
  ];

  const sortedTransforms = transforms.sort(
    (t1, t2) => (t1.installationOrder ?? 0) - (t2.installationOrder ?? 1)
  );

  const transformRefs = sortedTransforms.map((t) => ({
    id: t.installationName,
    type: ElasticsearchAssetType.transform,
    version: t.transformVersion,
  }));

  return {
    indicesToAddRefs,
    indexTemplatesRefs,
    componentTemplatesRefs,
    transformRefs,
    transforms: sortedTransforms,
    destinationIndexTemplates,
    transformsSpecifications,
    aliasesRefs,
    transformsToRemove,
    transformsToRemoveWithDestIndex,
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
      indicesToAddRefs,
      indexTemplatesRefs,
      componentTemplatesRefs,
      transformRefs,
      transforms,
      destinationIndexTemplates,
      transformsSpecifications,
      aliasesRefs,
      transformsToRemove,
      transformsToRemoveWithDestIndex,
    } = processTransformAssetsPerModule(
      installablePackage,
      installNameSuffix,
      transformPaths,
      previousInstalledTransformEsAssets
    );

    // ensure the .latest alias points to only the latest
    // by removing any associate of old destination indices
    await Promise.all(
      aliasesRefs
        .filter((a) => a.endsWith(TRANSFORM_DEST_IDX_ALIAS_LATEST_SFX))
        .map((alias) => deleteAliasFromIndices({ esClient, logger, alias }))
    );

    // delete all previous transform
    await Promise.all([
      deleteTransforms(
        esClient,
        transformsToRemoveWithDestIndex.map((asset) => asset.id),
        // Delete destination indices if specified or if from old json schema
        true
      ),
      deleteTransforms(
        esClient,
        transformsToRemove.map((asset) => asset.id),
        // Else, keep destination indices by default
        false
      ),
    ]);

    // get and save refs associated with the transforms before installing
    esReferences = await updateEsAssetReferences(
      savedObjectsClient,
      installablePackage.name,
      esReferences,
      {
        assetsToAdd: [
          ...indicesToAddRefs,
          ...indexTemplatesRefs,
          ...componentTemplatesRefs,
          ...transformRefs,
        ],
        assetsToRemove: [...transformsToRemove, ...transformsToRemoveWithDestIndex],
      }
    );

    // create index templates and component templates
    await Promise.all(
      destinationIndexTemplates
        .map((destinationIndexTemplate) => {
          const transformSpec = transformsSpecifications.get(
            destinationIndexTemplate.transformModuleId
          );
          const customMappings = transformSpec?.get('mappings') ?? {};
          const pipelineId = transformSpec?.get('destinationIndex')?.pipeline;
          const transformVersionChanged = transformSpec?.get('transformVersionChanged') ?? true;

          if (!transformVersionChanged) return;

          const registryElasticsearch: RegistryElasticsearch = {
            'index_template.settings': destinationIndexTemplate.template.settings,
            'index_template.mappings': destinationIndexTemplate.template.mappings,
          };

          const componentTemplates = buildComponentTemplates({
            mappings: customMappings,
            templateName: destinationIndexTemplate.installationName,
            registryElasticsearch,
            packageName: installablePackage.name,
            defaultSettings: {
              // Adding destination pipeline here because else these templates will be overridden
              // by index setting
              ...(pipelineId ? { default_pipeline: pipelineId } : {}),
            },
          });

          if (destinationIndexTemplate || customMappings) {
            return installComponentAndIndexTemplateForDataStream({
              esClient,
              logger,
              componentTemplates,
              indexTemplate: {
                templateName: destinationIndexTemplate.installationName,
                // @ts-expect-error data_stream property is not needed here
                indexTemplate: {
                  template: {
                    settings: undefined,
                    mappings: undefined,
                  },
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

        const aliases = transformsSpecifications
          .get(transform.transformModuleId)
          ?.get('destinationIndexAlias');
        try {
          const resp = await retryTransientEsErrors(
            () =>
              esClient.indices.create(
                {
                  index,
                  aliases,
                },
                { ignore: [400] }
              ),
            { logger }
          );
          logger.debug(`Created destination index: ${index}`);

          // If index already exists, we still need to update the destination index alias
          // to point '{destinationIndexName}.latest' to the versioned index
          // @ts-ignore status is a valid field of resp
          if (resp.status === 400 && aliases) {
            await retryTransientEsErrors(
              () =>
                esClient.indices.updateAliases({
                  body: {
                    actions: Object.keys(aliases).map((alias) => ({ add: { index, alias } })),
                  },
                }),
              { logger }
            );
            logger.debug(`Created aliases for destination index: ${index}`);
          }
        } catch (err) {
          logger.error(
            `Error creating destination index: ${JSON.stringify({
              index,
              aliases: transformsSpecifications
                .get(transform.transformModuleId)
                ?.get('destinationIndexAlias'),
            })} with error ${err}`
          );

          throw new Error(err.message);
        }
      })
    );

    // If the transforms have specific installation order, install & optionally start transforms sequentially
    const shouldInstallSequentially =
      uniqBy(transforms, 'installationOrder').length === transforms.length;

    if (shouldInstallSequentially) {
      for (const transform of transforms) {
        const installTransform = await handleTransformInstall({
          esClient,
          logger,
          transform,
          startTransform: transformsSpecifications.get(transform.transformModuleId)?.get('start'),
        });
        installedTransforms.push(installTransform);
      }
    } else {
      // Else, create & start all the transforms at once for speed
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
    if (previousInstalledTransformEsAssets.length > 0) {
      logger.debug(
        `Found previous transform references:\n ${JSON.stringify(
          previousInstalledTransformEsAssets
        )}`
      );
    }
  }

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

async function deleteAliasFromIndices({
  esClient,
  logger,
  alias,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  alias: string;
}) {
  try {
    const resp = await esClient.indices.getAlias({ name: alias });
    const indicesMatchingAlias = Object.keys(resp);
    logger.debug(`Deleting alias: '${alias}' matching indices ${indicesMatchingAlias}`);

    if (indicesMatchingAlias.length > 0) {
      await retryTransientEsErrors(
        () =>
          // defer validation on put if the source index is not available
          esClient.indices.deleteAlias(
            { index: indicesMatchingAlias, name: alias },
            { ignore: [404] }
          ),
        { logger }
      );
      logger.debug(`Deleted alias: '${alias}' matching indices ${indicesMatchingAlias}`);
    }
  } catch (err) {
    logger.error(`Error deleting alias: ${alias}`);
  }
}
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
    logger.debug(`Created transform: ${transform.installationName}`);
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
  suffix?: string
) => {
  const pathPaths = path.split('/');
  const filename = pathPaths?.pop()?.split('.')[0];
  const folderName = pathPaths?.pop();
  return `${installablePackage.name}.${folderName}-${filename}${suffix ? '-' + suffix : ''}`;
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
