/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from 'kibana/server';

import { ElasticsearchAssetType } from '../../../../../common/types/models';
import type {
  EsAssetReference,
  InstallablePackage,
  RegistryDataStream,
} from '../../../../../common/types/models';
import { getInstallation } from '../../packages';
import { saveInstalledEsRefs } from '../../packages/install';
import { getAsset } from '../transform/common';

import { getESAssetMetadata } from '../meta';
import { retryTransientEsErrors } from '../retry';

import { deleteIlmRefs, deleteIlms } from './remove';

interface IlmInstallation {
  installationName: string;
  content: string;
}

interface IlmPathDataset {
  path: string;
  dataStream: RegistryDataStream;
}

export const installIlmForDataStream = async (
  registryPackage: InstallablePackage,
  paths: string[],
  esClient: ElasticsearchClient,
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger
) => {
  const installation = await getInstallation({ savedObjectsClient, pkgName: registryPackage.name });
  let previousInstalledIlmEsAssets: EsAssetReference[] = [];
  if (installation) {
    previousInstalledIlmEsAssets = installation.installed_es.filter(
      ({ type, id }) => type === ElasticsearchAssetType.dataStreamIlmPolicy
    );
  }

  // delete all previous ilm
  await deleteIlms(
    esClient,
    previousInstalledIlmEsAssets.map((asset) => asset.id)
  );
  // install the latest dataset
  const dataStreams = registryPackage.data_streams;
  if (!dataStreams?.length) return [];
  const dataStreamIlmPaths = paths.filter((path) => isDataStreamIlm(path));
  let installedIlms: EsAssetReference[] = [];
  if (dataStreamIlmPaths.length > 0) {
    const ilmPathDatasets = dataStreams.reduce<IlmPathDataset[]>((acc, dataStream) => {
      dataStreamIlmPaths.forEach((path) => {
        if (isDatasetIlm(path, dataStream.path)) {
          acc.push({ path, dataStream });
        }
      });
      return acc;
    }, []);

    const ilmRefs = ilmPathDatasets.reduce<EsAssetReference[]>((acc, ilmPathDataset) => {
      if (ilmPathDataset) {
        acc.push({
          id: getIlmNameForInstallation(ilmPathDataset),
          type: ElasticsearchAssetType.dataStreamIlmPolicy,
        });
      }
      return acc;
    }, []);

    await saveInstalledEsRefs(savedObjectsClient, registryPackage.name, ilmRefs);

    const ilmInstallations: IlmInstallation[] = ilmPathDatasets.map(
      (ilmPathDataset: IlmPathDataset) => {
        const content = JSON.parse(getAsset(ilmPathDataset.path).toString('utf-8'));
        content.policy._meta = getESAssetMetadata({ packageName: installation?.name });

        return {
          installationName: getIlmNameForInstallation(ilmPathDataset),
          content,
        };
      }
    );

    const installationPromises = ilmInstallations.map(async (ilmInstallation) => {
      return handleIlmInstall({ esClient, ilmInstallation, logger });
    });

    installedIlms = await Promise.all(installationPromises).then((results) => results.flat());
  }

  if (previousInstalledIlmEsAssets.length > 0) {
    const currentInstallation = await getInstallation({
      savedObjectsClient,
      pkgName: registryPackage.name,
    });

    // remove the saved object reference
    await deleteIlmRefs(
      savedObjectsClient,
      currentInstallation?.installed_es || [],
      registryPackage.name,
      previousInstalledIlmEsAssets.map((asset) => asset.id),
      installedIlms.map((installed) => installed.id)
    );
  }
  return installedIlms;
};

async function handleIlmInstall({
  esClient,
  ilmInstallation,
  logger,
}: {
  esClient: ElasticsearchClient;
  ilmInstallation: IlmInstallation;
  logger: Logger;
}): Promise<EsAssetReference> {
  await retryTransientEsErrors(
    () =>
      esClient.transport.request({
        method: 'PUT',
        path: `/_ilm/policy/${ilmInstallation.installationName}`,
        body: ilmInstallation.content,
      }),
    { logger }
  );

  return { id: ilmInstallation.installationName, type: ElasticsearchAssetType.dataStreamIlmPolicy };
}

const isDataStreamIlm = (path: string) => {
  return new RegExp('(?<package>.*)/data_stream/(?<dataset>.*)/elasticsearch/ilm/*.*').test(path);
};

const isDatasetIlm = (path: string, datasetName: string) => {
  return new RegExp(`(?<package>.*)/data_stream\\/${datasetName}/elasticsearch/ilm/*.*`).test(path);
};

const getIlmNameForInstallation = (ilmPathDataset: IlmPathDataset) => {
  const filename = ilmPathDataset?.path.split('/')?.pop()?.split('.')[0];
  return `${ilmPathDataset.dataStream.type}-${ilmPathDataset.dataStream.package}.${ilmPathDataset.dataStream.path}-${filename}`;
};
