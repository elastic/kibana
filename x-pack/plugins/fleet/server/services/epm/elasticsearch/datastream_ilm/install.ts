/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import {
  ElasticsearchAssetType,
  EsAssetReference,
  InstallablePackage,
  RegistryDataStream,
} from '../../../../../common/types/models';
import { CallESAsCurrentUser } from '../../../../types';
import { getInstallation } from '../../packages';
import { deleteIlmRefs, deleteIlms } from './remove';
import { saveInstalledEsRefs } from '../../packages/install';
import { getAsset } from '../transform/common';

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
  callCluster: CallESAsCurrentUser,
  savedObjectsClient: SavedObjectsClientContract
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
    callCluster,
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
        return {
          installationName: getIlmNameForInstallation(ilmPathDataset),
          content: getAsset(ilmPathDataset.path).toString('utf-8'),
        };
      }
    );

    const installationPromises = ilmInstallations.map(async (ilmInstallation) => {
      return handleIlmInstall({ callCluster, ilmInstallation });
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
  callCluster,
  ilmInstallation,
}: {
  callCluster: CallESAsCurrentUser;
  ilmInstallation: IlmInstallation;
}): Promise<EsAssetReference> {
  await callCluster('transport.request', {
    method: 'PUT',
    path: `/_ilm/policy/${ilmInstallation.installationName}`,
    body: ilmInstallation.content,
  });

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
