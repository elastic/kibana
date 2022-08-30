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

import { processFields } from '../../fields/field';

import { generateMappings } from '../template/template';

import { getESAssetMetadata } from '../meta';

import { updateEsAssetReferences } from '../../packages/install';
import { getPathParts } from '../../archive';
import { ElasticsearchAssetType } from '../../../../../common/types/models';
import type { EsAssetReference, InstallablePackage } from '../../../../../common/types/models';
import { getInstallation } from '../../packages';

import { retryTransientEsErrors } from '../retry';

import { deleteTransforms } from './remove';
import { getAsset } from './common';

interface TransformInstallation {
  installationName: string;
  content: any;
}

export const installTransform = async (
  installablePackage: InstallablePackage,
  paths: string[],
  esClient: ElasticsearchClient,
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger,
  esReferences?: EsAssetReference[]
) => {
  console.log('installTransform');
  const installation = await getInstallation({
    savedObjectsClient,
    pkgName: installablePackage.name,
  });
  esReferences = esReferences ?? installation?.installed_es ?? [];
  console.log('esReferences', esReferences);

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
  console.log('previousInstalledTransformEsAssets', previousInstalledTransformEsAssets);

  // delete all previous transform
  await deleteTransforms(
    esClient,
    previousInstalledTransformEsAssets.map((asset) => asset.id)
  );

  const installNameSuffix = `${installablePackage.version}`;
  const transformPaths = paths.filter((path) => isTransform(path));
  const installedTransforms: EsAssetReference[] = [];
  if (transformPaths.length > 0) {
    const transformRefs = transformPaths.reduce<EsAssetReference[]>((acc, path) => {
      acc.push({
        id: getTransformNameForInstallation(installablePackage, path, installNameSuffix),
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

    {
      /* transformAssets is a map of each transform and its corresponding parsed & processed assets
  {
      [example_transform_1] => Map(4) {
        'mappings' => { properties: [Object] },
        '_meta' => { managed_by: 'fleet', managed: true, package: [Object] },
        'destinationIndexTemplate' => { properties: [Object] },
        'transform' => {
          source: [Object],
          dest: [Object],
        }
      },
      [example_transform_2] => Map(4) {
        'mappings' => { properties: [Object] },
        '_meta' => { managed_by: 'fleet', managed: true, package: [Object] },
        'destinationIndexTemplate' => { properties: [Object] },
        'transform' => {
          source: [Object],
          dest: [Object],
        }
      }

    }
  */
      const transformAssets = new Map();
      const transforms = [];
      transformPaths.forEach((path: string) => {
        const { folderName, fileName } = getTransformFolderAndFileNames(installablePackage, path);

        // Since there can be multiple assets per transform job definition
        // We want to create a unique list of assets for each main folder
        if (transformAssets.get(folderName) === undefined) {
          transformAssets.set(folderName, new Map());
        }
        const packageAssets = transformAssets.get(folderName);

        console.log(getTransformNameForInstallation(installablePackage, path, installNameSuffix));
        const content = safeLoad(getAsset(path).toString('utf-8'));

        if (fileName === 'fields') {
          const validFields = processFields(content);
          const mappings = generateMappings(validFields);
          transformAssets.get(folderName)?.set('mappings', mappings);
        }

        if (fileName === 'manifest') {
          // If manifest.yml contains destination_index_template
          // Combine the mappings and other index template settings from manifest.yml into a single index template
          // Create the index template and track the template in EsAssetReferences
          if (isPopulatedObject(content, ['destination_index_template'])) {
            const destinationIndexTemplate = content.destination_index_template as Record<
              string,
              unknown
            >;
            if (isPopulatedObject(packageAssets.get('mappings'))) {
              const mergedDestinationIndexTemplateWithMappings = {
                ...(destinationIndexTemplate ?? {}),
                mappings: {
                  ...destinationIndexTemplate.mappings,
                  ...packageAssets.get('mappings'),
                },
              };
              packageAssets.set(
                'destinationIndexTemplate',
                mergedDestinationIndexTemplateWithMappings
              );
            } else {
              transformAssets
                .get(folderName)
                ?.set('destinationIndexTemplate', destinationIndexTemplate);
            }
          }
        }

        if (fileName === 'transform') {
          transformAssets.get(folderName)?.set('transform', content);
        }

        // @todo: installation name
        // const content = JSON.parse(getAsset(path).toString('utf-8'));
        content._meta = getESAssetMetadata({ packageName: installablePackage.name });

        transformAssets
          .get(folderName)
          ?.set('_meta', getESAssetMetadata({ packageName: installablePackage.name }));

        return {
          transform: folderName,
          installationName: getTransformNameForInstallation(
            installablePackage,
            path,
            installNameSuffix
          ),
          content,
        };
      });

      console.log('Object.entries(transformAssets)', Object.entries(transformAssets));

      // const promises = await Promise.all(
      //   Object.entries(transformAssets).map(async ([moduleName, transformDefinition]) => {
      //     if ('destinationIndexTemplate' in transformDefinition) {
      //       // create destination index template
      //     }
      //     // create destination index if it has not been created
      //
      //     // create transform
      //
      //     console.log('moduleName', moduleName, 'transformDefinition', transformDefinition);
      //   })
      // );
      // console.log('promises', promises);

      // const installationPromises = transforms.map(async (transform) => {
      //   return handleTransformInstall({ esClient, logger, transform });
      // });
      //
      // installedTransforms = await Promise.all(installationPromises).then((results) =>
      //   results.flat()
      // );
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
  }
};

export const isTransform = (path: string) => {
  const pathParts = getPathParts(path);
  return !path.endsWith('/') && pathParts.type === ElasticsearchAssetType.transform;
};

async function installTransforms({
  esClient,
  logger,
  transform,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  transform: TransformInstallation;
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
  await esClient.transform.startTransform(
    { transform_id: transform.installationName },
    { ignore: [409] }
  );

  return { id: transform.installationName, type: ElasticsearchAssetType.transform };
}

async function handleTransformInstall({
  esClient,
  logger,
  transform,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  transform: TransformInstallation;
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
  await esClient.transform.startTransform(
    { transform_id: transform.installationName },
    { ignore: [409] }
  );

  return { id: transform.installationName, type: ElasticsearchAssetType.transform };
}

const getTransformNameForInstallation = (
  installablePackage: InstallablePackage,
  path: string,
  suffix: string
) => {
  const pathPaths = path.split('/');
  const filename = pathPaths?.pop()?.split('.')[0];
  const folderName = pathPaths?.pop();
  return `${installablePackage.name}.${folderName}-${filename}-${suffix}`;
};

const getTransformFolderAndFileNames = (installablePackage: InstallablePackage, path: string) => {
  const pathPaths = path.split('/');
  const fileName = pathPaths?.pop()?.split('.')[0];
  let folderName = pathPaths?.pop();

  // If fields.yml is located inside a directory called 'fields' (e.g. {exampleFolder}/fields/fields.yml)
  // We need to go one level up to get the real folder name
  if (folderName === 'fields') {
    folderName = pathPaths?.pop();
  }
  return { fileName, folderName };
};
