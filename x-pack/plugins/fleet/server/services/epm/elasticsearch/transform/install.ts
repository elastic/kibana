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
  IndexTemplateEntry,
} from '../../../../../common/types/models';
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

    const transformAssets = new Map();
    const destinationIndexTemplates = [];
    const indices = [];
    const transforms: TransformInstallation[] = [];

    transformPaths.forEach((path: string) => {
      const { folderName, fileName } = getTransformFolderAndFileNames(installablePackage, path);

      // Since there can be multiple assets per transform job definition
      // We want to create a unique list of assets for each main folder
      if (transformAssets.get(folderName) === undefined) {
        transformAssets.set(folderName, new Map());
      }
      const packageAssets = transformAssets.get(folderName);

      const content = safeLoad(getAsset(path).toString('utf-8'));

      if (fileName === 'fields') {
        const validFields = processFields(content);
        const mappings = generateMappings(validFields);
        transformAssets.get(folderName)?.set('mappings', mappings);
      }

      if (fileName === 'transform') {
        transformAssets.get(folderName)?.set('destinationIndex', content.dest);
        transformAssets.get(folderName)?.set('transform', content);
        content._meta = getESAssetMetadata({ packageName: installablePackage.name });
        transforms.push({
          folderName,
          installationName: getTransformNameForInstallation(
            installablePackage,
            path,
            installNameSuffix
          ),
          content,
        });
        indices.push(content.dest);
      }

      if (fileName === 'manifest') {
        console.log('content', JSON.stringify(content));
        if (isPopulatedObject(content, ['start']) && content.start === false) {
          transformAssets.get(folderName)?.set('start', false);
        }
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
            // @todo: check name
            destinationIndexTemplates.push({
              folderName,
              _meta: getESAssetMetadata({ packageName: installablePackage.name }),
              name: getTransformNameForInstallation(installablePackage, path, installNameSuffix),
              template: mergedDestinationIndexTemplateWithMappings,
            } as IndexTemplateEntry);
            packageAssets.set(
              'destinationIndexTemplate',
              mergedDestinationIndexTemplateWithMappings
            );
          } else {
            transformAssets
              .get(folderName)
              ?.set('destinationIndexTemplate', destinationIndexTemplate);
            destinationIndexTemplates.push({
              folderName,
              name: getTransformNameForInstallation(installablePackage, path, installNameSuffix),
              template: destinationIndexTemplate,
              _meta: getESAssetMetadata({ packageName: installablePackage.name }),
            } as IndexTemplateEntry);
          }
        }
      }

      // transformAssets
      //   .get(folderName)
      //   ?.set('_meta', getESAssetMetadata({ packageName: installablePackage.name }));

      return {
        folderName,
        installationName: getTransformNameForInstallation(
          installablePackage,
          path,
          installNameSuffix
        ),
        content,
      };
    });

    console.log(
      'destinationIndexTemplates',
      destinationIndexTemplates.map((destinationIndexTemplate) =>
        JSON.stringify({
          // esClient,
          // logger,
          // componentTemplates: {},
          indexTemplate: {
            templateName: destinationIndexTemplate.name,
            indexTemplate: {
              ...destinationIndexTemplate.template,
              priority: 200,
              index_patterns: [
                transformAssets.get(destinationIndexTemplate.folderName)?.get('destinationIndex'),
              ],
              _meta: destinationIndexTemplate._meta,
            },
          },
        })
      )
    );

    const indexTemplates = await Promise.all(
      destinationIndexTemplates.map((destinationIndexTemplate) => {
        return installComponentAndIndexTemplateForDataStream({
          esClient,
          logger,
          componentTemplates: {},
          indexTemplate: {
            templateName: destinationIndexTemplate.name,
            indexTemplate: {
              template: destinationIndexTemplate.template,
              priority: 200,
              // @todo: verify if this is correct
              index_patterns: [
                transformAssets.get(destinationIndexTemplate.folderName)?.get('destinationIndex')
                  .index,
              ],
              _meta: destinationIndexTemplate._meta,
              // data_stream: { hidden: false },
              composed_of: [],
            },
          },
        });
      })
    );

    const installationPromises = transforms.map(async (transform) => {
      console.log('transform.folderName', transformAssets.get(transform.folderName)?.get('start'));
      return handleTransformInstall({
        esClient,
        logger,
        transform,
        startTransform: transformAssets.get(transform.folderName)?.get('start'),
      });
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
  console.log(transform.installationName, startTransform);
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

  if (startTransform === undefined || startTransform === true) {
    console.log('starting transform', transform.installationName);
    await esClient.transform.startTransform(
      { transform_id: transform.installationName },
      { ignore: [409] }
    );
  }

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
