/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';

import { saveInstalledEsRefs } from '../../packages/install';
import * as Registry from '../../registry';
import {
  Dataset,
  ElasticsearchAssetType,
  EsAssetReference,
  RegistryPackage,
} from '../../../../../common/types/models';
import { CallESAsCurrentUser } from '../../../../types';
import { getInstallation } from '../../packages';
import { deleteTransforms, deleteTransformRefs } from './remove';
import { getAsset } from './common';

interface TransformInstallation {
  installationName: string;
  content: string;
}

interface TransformPathDataset {
  path: string;
  dataset: Dataset;
}

export const installTransformForDataset = async (
  registryPackage: RegistryPackage,
  paths: string[],
  callCluster: CallESAsCurrentUser,
  savedObjectsClient: SavedObjectsClientContract
) => {
  const installation = await getInstallation({ savedObjectsClient, pkgName: registryPackage.name });
  let previousInstalledTransformEsAssets: EsAssetReference[] = [];
  if (installation) {
    previousInstalledTransformEsAssets = installation.installed_es.filter(
      ({ type, id }) => type === ElasticsearchAssetType.transform
    );
  }

  // delete all previous transform
  await deleteTransforms(
    callCluster,
    previousInstalledTransformEsAssets.map((asset) => asset.id)
  );
  // install the latest dataset
  const datasets = registryPackage.datasets;
  if (!datasets?.length) return [];
  const installNameSuffix = `${registryPackage.version}`;

  const transformPaths = paths.filter((path) => isTransform(path));

  const transformPathDatasets = datasets.reduce<TransformPathDataset[]>((acc, dataset) => {
    transformPaths.forEach((path) => {
      if (isDatasetTransform(path, dataset.path)) {
        acc.push({ path, dataset });
      }
    });
    return acc;
  }, []);

  const transformRefs = transformPathDatasets.reduce<EsAssetReference[]>(
    (acc, transformPathDataset) => {
      if (transformPathDataset) {
        acc.push({
          id: getTransformNameForInstallation(transformPathDataset, installNameSuffix),
          type: ElasticsearchAssetType.transform,
        });
      }
      return acc;
    },
    []
  );

  // get and save transform refs before installing transforms
  await saveInstalledEsRefs(savedObjectsClient, registryPackage.name, transformRefs);

  const transforms: TransformInstallation[] = transformPathDatasets.map(
    (transformPathDataset: TransformPathDataset) => {
      return {
        installationName: getTransformNameForInstallation(transformPathDataset, installNameSuffix),
        content: getAsset(transformPathDataset.path).toString('utf-8'),
      };
    }
  );

  const installationPromises = transforms.map(async (transform) => {
    return installTransform({ callCluster, transform });
  });

  const installedTransforms = await Promise.all([
    Promise.all(installationPromises),
  ]).then((results) => results.flat());

  const currentInstallation = await getInstallation({
    savedObjectsClient,
    pkgName: registryPackage.name,
  });

  // remove the saved object reference
  await deleteTransformRefs(
    savedObjectsClient,
    currentInstallation?.installed_es || [],
    registryPackage.name,
    previousInstalledTransformEsAssets.map((asset) => asset.id),
    installedTransforms.map((installed) => installed.id)
  );

  return installedTransforms;
};

const isTransform = (path: string) => {
  const pathParts = Registry.pathParts(path);
  return pathParts.type === ElasticsearchAssetType.transform;
};

const isDatasetTransform = (path: string, datasetName: string) => {
  const pathParts = Registry.pathParts(path);
  return (
    !path.endsWith('/') &&
    pathParts.type === ElasticsearchAssetType.transform &&
    pathParts.dataset !== undefined &&
    datasetName === pathParts.dataset
  );
};

async function installTransform({
  callCluster,
  transform,
}: {
  callCluster: CallESAsCurrentUser;
  transform: TransformInstallation;
}): Promise<EsAssetReference> {
  const callClusterParams: {
    method: string;
    path: string;
    query: string;
    ignore?: number[];
    body: any;
    headers?: any;
  } = {
    method: 'PUT',
    path: `/_transform/${transform.installationName}`,
    query: 'defer_validation=true',
    body: transform.content,
  };
  /* if (pipeline.extension === 'yml') {
      callClusterParams.headers = { ['Content-Type']: 'application/yaml' };
    }*/

  // This uses the catch-all endpoint 'transport.request' because we have to explicitly
  // set the Content-Type header above for sending yml data. Setting the headers is not
  // exposed in the convenience endpoint 'ingest.putPipeline' of elasticsearch-js-legacy
  // which we could otherwise use.
  // See src/core/server/elasticsearch/api_types.ts for available endpoints.
  await callCluster('transport.request', {
    method: 'DELETE',
    query: 'force=true',
    path: `_transform/${transform.installationName}`,
    ignore: [404, 400],
  });
  await callCluster('transport.request', callClusterParams);
  await callCluster('transport.request', {
    method: 'POST',
    path: `/_transform/${transform.installationName}/_start`,
  });

  return { id: transform.installationName, type: ElasticsearchAssetType.transform };
}

const getTransformNameForInstallation = (
  transformDataset: TransformPathDataset,
  suffix: string
) => {
  const filename = transformDataset?.path.split('/')?.pop()?.split('.')[0];
  return `${transformDataset.dataset.type}-${transformDataset.dataset.name}-${filename}-${suffix}`;
};
