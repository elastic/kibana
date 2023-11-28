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

import type { HTTPAuthorizationHeader } from '../../../../../common/http_authorization_header';

import type { SecondaryAuthorizationHeader } from '../../../../../common/types/models/transform_api_key';

import { generateTransformSecondaryAuthHeaders } from '../../../api_keys/transform_api_keys';

import {
  PACKAGE_TEMPLATE_SUFFIX,
  USER_SETTINGS_TEMPLATE_SUFFIX,
} from '../../../../../common/constants';
import {
  buildComponentTemplates,
  installComponentAndIndexTemplateForDataStream,
} from '../template/install';
import { isFields, processFields } from '../../fields/field';
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
import { getDestinationIndexAliases } from './transform_utils';

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
  runAsKibanaSystem?: boolean;
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
  previousInstalledTransformEsAssets: EsAssetReference[] = [],
  force?: boolean,
  username?: string
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

    // Handling fields.yml and all other files within 'fields' folder
    if (fileName === TRANSFORM_SPECS_TYPES.FIELDS || isFields(path)) {
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

      // If there's already mappings set previously, append it to new
      const previousMappings =
        transformsSpecifications.get(transformModuleId)?.get('mappings') ?? {};

      transformsSpecifications.get(transformModuleId)?.set('mappings', {
        properties: { ...previousMappings.properties, ...mappings.properties },
      });
    }

    if (fileName === TRANSFORM_SPECS_TYPES.TRANSFORM) {
      const installationOrder =
        isFinite(content._meta?.order) && content._meta?.order >= 0 ? content._meta?.order : 0;
      const transformVersion = content._meta?.fleet_transform_version ?? '0.1.0';

      transformsSpecifications
        .get(transformModuleId)
        ?.set('originalDestinationIndexName', content.dest.index);

      // Create two aliases associated with the destination index
      // for better handling during upgrades
      const aliases = getDestinationIndexAliases(content.dest.aliases);
      const aliasNames = aliases.map((a) => a.alias);
      // Override yml settings with alia format for transform's dest.aliases
      content.dest.aliases = aliases;

      indicesToAddRefs.push({
        id: content.dest.index,
        type: ElasticsearchAssetType.index,
      });

      // If run_as_kibana_system is not set, or is set to true, then run as kibana_system user
      // else, run with user's secondary credentials
      const runAsKibanaSystem = content._meta?.run_as_kibana_system !== false;

      transformsSpecifications.get(transformModuleId)?.set('destinationIndex', content.dest);
      transformsSpecifications.get(transformModuleId)?.set('destinationIndexAlias', aliases);
      transformsSpecifications.get(transformModuleId)?.set('transform', content);
      transformsSpecifications.get(transformModuleId)?.set('transformVersion', transformVersion);

      content._meta = {
        ...(content._meta ?? {}),
        ...getESAssetMetadata({ packageName: installablePackage.name }),
        ...(username ? { installed_by: username } : {}),
        run_as_kibana_system: runAsKibanaSystem,
      };

      const installationName = getTransformAssetNameForInstallation(
        installablePackage,
        transformModuleId,
        // transform_id is versioned by fleet_transform_version and not by package version
        `default-${transformVersion}`
      );

      // Here, we track if fleet_transform_version (not package version) has changed based on installation name
      // if version has changed, install transform and update es assets
      // else, don't delete the dest index and install transform as it can be an expensive operation
      const matchingTransformFromPrevInstall = previousInstalledTransformEsAssets.find(
        (t) => t.id === installationName
      );

      const currentTransformSameAsPrev = matchingTransformFromPrevInstall !== undefined;
      if (previousInstalledTransformEsAssets.length === 0) {
        aliasesRefs.push(...aliasNames);
        transforms.push({
          transformModuleId,
          installationName,
          installationOrder,
          transformVersion,
          content,
          runAsKibanaSystem,
        });
        transformsSpecifications.get(transformModuleId)?.set('transformVersionChanged', true);
      } else {
        if (force || !currentTransformSameAsPrev) {
          // If we are reinstalling the package (i.e. force = true),
          // force delete old transforms so we can reinstall the same transforms again
          if (force && matchingTransformFromPrevInstall) {
            transformsToRemoveWithDestIndex.push(matchingTransformFromPrevInstall);
          } else {
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
          }
          transforms.push({
            transformModuleId,
            installationName,
            installationOrder,
            transformVersion,
            content,
            runAsKibanaSystem,
          });
          transformsSpecifications.get(transformModuleId)?.set('transformVersionChanged', true);
          if (aliasNames.length > 0) {
            aliasesRefs.push(...aliasNames);
          }
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
  previousInstalledTransformEsAssets: EsAssetReference[] = [],
  force?: boolean,
  authorizationHeader?: HTTPAuthorizationHeader | null
) => {
  let installedTransforms: EsAssetReference[] = [];
  const username = authorizationHeader?.getUsername();

  if (transformPaths.length > 0) {
    const {
      indicesToAddRefs,
      indexTemplatesRefs,
      componentTemplatesRefs,
      transformRefs,
      transforms,
      destinationIndexTemplates,
      transformsSpecifications,
      transformsToRemove,
      transformsToRemoveWithDestIndex,
    } = processTransformAssetsPerModule(
      installablePackage,
      installNameSuffix,
      transformPaths,
      previousInstalledTransformEsAssets,
      force,
      username
    );

    // By default, for internal Elastic packages that touch system indices, we want to run as internal user
    // so we set runAsKibanaSystem: true by default (e.g. when run_as_kibana_system set to true/not defined in yml file).
    // If package should be installed as the logged in user, set run_as_kibana_system: false,
    // generate api key, and pass es-secondary-authorization in header when creating the transforms.
    const secondaryAuth = transforms.some((t) => t.runAsKibanaSystem === false)
      ? await generateTransformSecondaryAuthHeaders({
          authorizationHeader,
          logger,
          pkgName: installablePackage.name,
          pkgVersion: installablePackage.version,
          username,
        })
      : // No need to generate api key/secondary auth if all transforms are run as kibana_system user
        undefined;

    // delete all previous transform
    await Promise.all([
      deleteTransforms(
        esClient,
        transformsToRemoveWithDestIndex.map((asset) => asset.id),
        // Delete destination indices if specified or if from old json schema
        true,
        secondaryAuth
      ),
      deleteTransforms(
        esClient,
        transformsToRemove.map((asset) => asset.id),
        // Else, keep destination indices by default
        false,
        secondaryAuth
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
          secondaryAuth: transform.runAsKibanaSystem !== false ? undefined : secondaryAuth,
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
          secondaryAuth: transform.runAsKibanaSystem !== false ? undefined : secondaryAuth,
        });
      });

      installedTransforms = await Promise.all(transformsPromises).then((results) => results.flat());
    }

    // If user does not have sufficient permissions to start the transforms,
    // we need to mark them as deferred installations without blocking full package installation
    // so that they can be updated/re-authorized later

    if (installedTransforms.length > 0) {
      // get and save refs associated with the transforms before installing
      esReferences = await updateEsAssetReferences(
        savedObjectsClient,
        installablePackage.name,
        esReferences,
        {
          assetsToRemove: installedTransforms,
          assetsToAdd: installedTransforms,
        }
      );
    }
  }

  return { installedTransforms, esReferences };
};

interface InstallTransformsParams {
  installablePackage: InstallablePackage;
  paths: string[];
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  esReferences?: EsAssetReference[];
  /**
   * Force transforms to install again even though fleet_transform_version might be same
   * Should be true when package is re-installing
   */
  force?: boolean;
  /**
   * Authorization header parsed from original Kibana request, used to generate API key from user
   * to pass in secondary authorization info to transform
   */
  authorizationHeader?: HTTPAuthorizationHeader | null;
}
export const installTransforms = async ({
  installablePackage,
  paths,
  esClient,
  savedObjectsClient,
  logger,
  force,
  esReferences,
  authorizationHeader,
}: InstallTransformsParams) => {
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

  // If package contains yml transform specifications
  return await installTransformsAssets(
    installablePackage,
    installNameSuffix,
    transformPaths,
    esClient,
    savedObjectsClient,
    logger,
    esReferences,
    previousInstalledTransformEsAssets,
    force,
    authorizationHeader
  );
};

export const isTransform = (path: string) => {
  const pathParts = getPathParts(path);
  return !path.endsWith('/') && pathParts.type === ElasticsearchAssetType.transform;
};

interface TransformEsAssetReference extends EsAssetReference {
  version?: string;
}
/**
 * Create transform and optionally start transform
 * Note that we want to add the current user's roles/permissions to the es-secondary-auth with a API Key.
 * If API Key has insufficient permissions, it should still create the transforms but not start it
 * Instead of failing, we need to allow package to continue installing other assets
 * and prompt for users to authorize the transforms with the appropriate permissions after package is done installing
 */
async function handleTransformInstall({
  esClient,
  logger,
  transform,
  startTransform,
  secondaryAuth,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  transform: TransformInstallation;
  startTransform?: boolean;
  secondaryAuth?: SecondaryAuthorizationHeader;
}): Promise<TransformEsAssetReference> {
  let isUnauthorizedAPIKey = false;
  try {
    await retryTransientEsErrors(
      () =>
        // defer_validation: true on put if the source index is not available
        // but will check if API Key has sufficient permission
        esClient.transform.putTransform(
          {
            transform_id: transform.installationName,
            defer_validation: true,
            body: transform.content,
          },
          // add '{ headers: { es-secondary-authorization: 'ApiKey {encodedApiKey}' } }'
          secondaryAuth ? { ...secondaryAuth } : undefined
        ),
      { logger }
    );
    logger.debug(`Created transform: ${transform.installationName}`);
  } catch (err) {
    const isResponseError = err instanceof errors.ResponseError;
    isUnauthorizedAPIKey =
      isResponseError &&
      err?.body?.error?.type === 'security_exception' &&
      err?.body?.error?.reason?.includes('unauthorized for API key');

    const isAlreadyExistError =
      isResponseError && err?.body?.error?.type === 'resource_already_exists_exception';

    // swallow the error if the transform already exists or if API key has insufficient permissions
    if (!isUnauthorizedAPIKey && !isAlreadyExistError) {
      throw err;
    }
  }

  // start transform by default if not set in yml file
  // else, respect the setting
  if (startTransform === undefined || startTransform === true) {
    try {
      await retryTransientEsErrors(
        () =>
          esClient.transform.startTransform(
            { transform_id: transform.installationName },
            { ignore: [409] }
          ),
        { logger, additionalResponseStatuses: [400] }
      );
      logger.debug(`Started transform: ${transform.installationName}`);
    } catch (err) {
      const isResponseError = err instanceof errors.ResponseError;
      isUnauthorizedAPIKey =
        isResponseError &&
        // if transform was created with insufficient permission,
        // _start will yield an error
        err?.body?.error?.type === 'security_exception' &&
        err?.body?.error?.reason?.includes('lacks the required permissions');

      // swallow the error if the transform can't be started if API key has insufficient permissions
      if (!isUnauthorizedAPIKey) {
        throw err;
      }
    }
  } else {
    // if transform was not set to start automatically in yml config,
    // we need to check using _stats if the transform had insufficient permissions
    try {
      const transformStats = await retryTransientEsErrors(
        () =>
          esClient.transform.getTransformStats(
            { transform_id: transform.installationName },
            { ignore: [409] }
          ),
        { logger, additionalResponseStatuses: [400] }
      );
      if (Array.isArray(transformStats.transforms) && transformStats.transforms.length === 1) {
        const transformHealth = transformStats.transforms[0].health;
        if (
          transformHealth &&
          transformHealth.status === 'red' &&
          // @ts-expect-error TransformGetTransformStatsTransformStatsHealth should have 'issues'
          Array.isArray(transformHealth.issues) &&
          // @ts-expect-error TransformGetTransformStatsTransformStatsHealth should have 'issues'
          transformHealth.issues.find(
            (i: { issue: string }) => i.issue === 'Privileges check failed'
          )
        ) {
          isUnauthorizedAPIKey = true;
        }
      }
    } catch (err) {
      logger.debug(
        `Error getting transform stats for transform: ${transform.installationName} cause ${err}`
      );
    }
  }

  return {
    id: transform.installationName,
    type: ElasticsearchAssetType.transform,
    // If isUnauthorizedAPIKey: true (due to insufficient user permission at transform creation)
    // that means the transform is created but not started.
    // Note in saved object this is a deferred installation so user can later reauthorize
    deferred: isUnauthorizedAPIKey,
    version: transform.transformVersion,
  };
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
