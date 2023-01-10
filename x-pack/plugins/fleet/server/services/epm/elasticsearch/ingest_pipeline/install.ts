/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransportRequestOptions } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import { ElasticsearchAssetType } from '../../../../types';
import type {
  EsAssetReference,
  RegistryDataStream,
  InstallablePackage,
  PackageInfo,
} from '../../../../types';
import { getAsset, getPathParts } from '../../archive';
import type { ArchiveEntry } from '../../archive';
import {
  FLEET_FINAL_PIPELINE_CONTENT,
  FLEET_FINAL_PIPELINE_ID,
  FLEET_FINAL_PIPELINE_VERSION,
} from '../../../../constants';
import {
  getCustomPipelineNameForDatastream,
  getPipelineNameForDatastream,
} from '../../../../../common/services';

import { appendMetadataToIngestPipeline } from '../meta';
import { retryTransientEsErrors } from '../retry';

import {
  getPipelineNameForInstallation,
  rewriteIngestPipeline,
  isTopLevelPipeline,
  addCustomPipelineProcessor,
} from './helpers';
import type { PipelineInstall, RewriteSubstitution } from './types';

export const prepareToInstallPipelines = (
  installablePackage: InstallablePackage | PackageInfo,
  paths: string[],
  onlyForDataStream?: RegistryDataStream
): {
  assetsToAdd: EsAssetReference[];
  install: (esClient: ElasticsearchClient, logger: Logger) => Promise<void>;
} => {
  // unlike other ES assets, pipeline names are versioned so after a template is updated
  // it can be created pointing to the new template, without removing the old one and effecting data
  // so do not remove the currently installed pipelines here
  const dataStreams = onlyForDataStream ? [onlyForDataStream] : installablePackage.data_streams;
  const { version: pkgVersion } = installablePackage;
  const pipelinePaths = paths.filter((path) => isPipeline(path));
  const topLevelPipelinePaths = paths.filter((path) => isTopLevelPipeline(path));

  if (!dataStreams?.length && topLevelPipelinePaths.length === 0)
    return { assetsToAdd: [], install: () => Promise.resolve() };

  // get and save pipeline refs before installing pipelines
  let pipelineRefs = dataStreams
    ? dataStreams.reduce<EsAssetReference[]>((acc, dataStream) => {
        const filteredPaths = pipelinePaths.filter((path) =>
          isDataStreamPipeline(path, dataStream.path)
        );
        let createdDatastreamPipeline = false;
        const pipelineObjectRefs = filteredPaths.map((path) => {
          const { name } = getNameAndExtension(path);
          if (name === dataStream.ingest_pipeline) {
            createdDatastreamPipeline = true;
          }
          const nameForInstallation = getPipelineNameForInstallation({
            pipelineName: name,
            dataStream,
            packageVersion: pkgVersion,
          });
          return { id: nameForInstallation, type: ElasticsearchAssetType.ingestPipeline };
        });
        if (!createdDatastreamPipeline) {
          const nameForInstallation = getPipelineNameForDatastream({
            dataStream,
            packageVersion: pkgVersion,
          });
          acc.push({ id: nameForInstallation, type: ElasticsearchAssetType.ingestPipeline });
        }
        acc.push(...pipelineObjectRefs);
        return acc;
      }, [])
    : [];

  const topLevelPipelineRefs = topLevelPipelinePaths.map((path) => {
    const { name } = getNameAndExtension(path);

    const nameForInstallation = getPipelineNameForInstallation({
      pipelineName: name,
      packageVersion: pkgVersion,
    });
    return { id: nameForInstallation, type: ElasticsearchAssetType.ingestPipeline };
  });

  pipelineRefs = [...pipelineRefs, ...topLevelPipelineRefs];

  return {
    assetsToAdd: pipelineRefs,
    install: async (esClient, logger) => {
      const pipelines = dataStreams
        ? dataStreams.reduce<Array<Promise<EsAssetReference[]>>>((acc, dataStream) => {
            acc.push(
              installAllPipelines({
                dataStream,
                esClient,
                logger,
                paths: pipelinePaths,
                installablePackage,
              })
            );

            return acc;
          }, [])
        : [];

      if (topLevelPipelinePaths) {
        pipelines.push(
          installAllPipelines({
            dataStream: undefined,
            esClient,
            logger,
            paths: topLevelPipelinePaths,
            installablePackage,
          })
        );
      }

      await Promise.all(pipelines);
    },
  };
};

export async function installAllPipelines({
  esClient,
  logger,
  paths,
  dataStream,
  installablePackage,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  paths: string[];
  dataStream?: RegistryDataStream;
  installablePackage: InstallablePackage | PackageInfo;
}): Promise<EsAssetReference[]> {
  const pipelinePaths = dataStream
    ? paths.filter((path) => isDataStreamPipeline(path, dataStream.path))
    : paths;
  const pipelinesInfos: Array<{
    nameForInstallation: string;
    customIngestPipelineNameForInstallation?: string;
    content: string;
    extension: string;
  }> = [];
  const substitutions: RewriteSubstitution[] = [];

  let datastreamPipelineCreated = false;
  pipelinePaths.forEach((path) => {
    const { name, extension } = getNameAndExtension(path);
    const isMainPipeline = name === dataStream?.ingest_pipeline;
    if (isMainPipeline) {
      datastreamPipelineCreated = true;
    }
    const nameForInstallation = getPipelineNameForInstallation({
      pipelineName: name,
      dataStream,
      packageVersion: installablePackage.version,
    });
    const content = getAsset(path).toString('utf-8');
    pipelinesInfos.push({
      nameForInstallation,
      customIngestPipelineNameForInstallation:
        dataStream && isMainPipeline ? getCustomPipelineNameForDatastream(dataStream) : undefined,
      content,
      extension,
    });
    substitutions.push({
      source: name,
      target: nameForInstallation,
      templateFunction: 'IngestPipeline',
    });
  });

  const pipelinesToInstall: PipelineInstall[] = pipelinesInfos.map((pipeline) => {
    return {
      ...pipeline,
      contentForInstallation: rewriteIngestPipeline(pipeline.content, substitutions),
    };
  });

  if (!datastreamPipelineCreated && dataStream) {
    const nameForInstallation = getPipelineNameForDatastream({
      dataStream,
      packageVersion: installablePackage.version,
    });

    pipelinesToInstall.push({
      nameForInstallation,
      customIngestPipelineNameForInstallation: getCustomPipelineNameForDatastream(dataStream),
      contentForInstallation: 'processors: []',
      extension: 'yml',
    });
  }

  const installationPromises = pipelinesToInstall.map(async (pipeline) => {
    return installPipeline({ esClient, pipeline, installablePackage, logger });
  });

  return Promise.all(installationPromises);
}

async function installPipeline({
  esClient,
  logger,
  pipeline,
  installablePackage,
  shouldAddCustomPipelineProcessor = true,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  pipeline: PipelineInstall;
  installablePackage?: InstallablePackage | PackageInfo;
  shouldAddCustomPipelineProcessor?: boolean;
}): Promise<EsAssetReference> {
  let pipelineToInstall = appendMetadataToIngestPipeline({
    pipeline,
    packageName: installablePackage?.name,
  });

  if (shouldAddCustomPipelineProcessor) {
    pipelineToInstall = addCustomPipelineProcessor(pipelineToInstall);
  }

  const esClientParams = {
    id: pipelineToInstall.nameForInstallation,
    body:
      pipelineToInstall.extension === 'yml'
        ? pipelineToInstall.contentForInstallation
        : JSON.parse(pipelineToInstall.contentForInstallation),
  };

  const esClientRequestOptions: TransportRequestOptions = {
    ignore: [404],
  };

  if (pipelineToInstall.extension === 'yml') {
    esClientRequestOptions.headers = {
      // pipeline is YAML
      'Content-Type': 'application/yaml',
      // but we want JSON responses (to extract error messages, status code, or other metadata)
      Accept: 'application/json',
    };
  }

  await retryTransientEsErrors(
    () => esClient.ingest.putPipeline(esClientParams, esClientRequestOptions),
    { logger }
  );

  return {
    id: pipelineToInstall.nameForInstallation,
    type: ElasticsearchAssetType.ingestPipeline,
  };
}

export async function ensureFleetFinalPipelineIsInstalled(
  esClient: ElasticsearchClient,
  logger: Logger
) {
  const esClientRequestOptions: TransportRequestOptions = {
    ignore: [404],
  };
  const res = await esClient.ingest.getPipeline(
    { id: FLEET_FINAL_PIPELINE_ID },
    { ...esClientRequestOptions, meta: true }
  );

  const installedVersion = res?.body[FLEET_FINAL_PIPELINE_ID]?.version;
  if (
    res.statusCode === 404 ||
    !installedVersion ||
    installedVersion < FLEET_FINAL_PIPELINE_VERSION
  ) {
    await installPipeline({
      esClient,
      logger,
      pipeline: {
        nameForInstallation: FLEET_FINAL_PIPELINE_ID,
        contentForInstallation: FLEET_FINAL_PIPELINE_CONTENT,
        extension: 'yml',
      },
    });
    return { isCreated: true };
  }

  return { isCreated: false };
}

const isDirectory = ({ path }: ArchiveEntry) => path.endsWith('/');

const isDataStreamPipeline = (path: string, dataStreamDataset: string) => {
  const pathParts = getPathParts(path);
  return (
    !isDirectory({ path }) &&
    pathParts.type === ElasticsearchAssetType.ingestPipeline &&
    pathParts.dataset !== undefined &&
    dataStreamDataset === pathParts.dataset
  );
};
const isPipeline = (path: string) => {
  const pathParts = getPathParts(path);
  return pathParts.type === ElasticsearchAssetType.ingestPipeline;
};

// XXX: assumes path/to/file.ext -- 0..n '/' and exactly one '.'
const getNameAndExtension = (
  path: string
): {
  name: string;
  extension: string;
} => {
  const splitPath = path.split('/');
  const filename = splitPath[splitPath.length - 1];
  return {
    name: filename.split('.')[0],
    extension: filename.split('.')[1],
  };
};
