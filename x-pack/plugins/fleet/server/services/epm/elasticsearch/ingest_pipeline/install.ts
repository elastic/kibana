/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransportRequestOptions } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from 'src/core/server';

import { ElasticsearchAssetType } from '../../../../types';
import type { EsAssetReference, RegistryDataStream, InstallablePackage } from '../../../../types';
import { getAsset, getPathParts } from '../../archive';
import type { ArchiveEntry } from '../../archive';
import { saveInstalledEsRefs } from '../../packages/install';
import { getInstallationObject } from '../../packages';
import {
  FLEET_FINAL_PIPELINE_CONTENT,
  FLEET_FINAL_PIPELINE_ID,
  FLEET_FINAL_PIPELINE_VERSION,
} from '../../../../constants';

import { appendMetadataToIngestPipeline } from '../meta';

import { retryTransientEsErrors } from '../retry';

import { deletePipelineRefs } from './remove';

interface RewriteSubstitution {
  source: string;
  target: string;
  templateFunction: string;
}

export const isTopLevelPipeline = (path: string) => {
  const pathParts = getPathParts(path);
  return (
    pathParts.type === ElasticsearchAssetType.ingestPipeline && pathParts.dataset === undefined
  );
};

export const installPipelines = async (
  installablePackage: InstallablePackage,
  paths: string[],
  esClient: ElasticsearchClient,
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger
) => {
  // unlike other ES assets, pipeline names are versioned so after a template is updated
  // it can be created pointing to the new template, without removing the old one and effecting data
  // so do not remove the currently installed pipelines here
  const dataStreams = installablePackage.data_streams;
  const { name: pkgName, version: pkgVersion } = installablePackage;
  const pipelinePaths = paths.filter((path) => isPipeline(path));
  const topLevelPipelinePaths = paths.filter((path) => isTopLevelPipeline(path));

  if (!dataStreams?.length && topLevelPipelinePaths.length === 0) return [];

  // get and save pipeline refs before installing pipelines
  let pipelineRefs = dataStreams
    ? dataStreams.reduce<EsAssetReference[]>((acc, dataStream) => {
        const filteredPaths = pipelinePaths.filter((path) =>
          isDataStreamPipeline(path, dataStream.path)
        );
        const pipelineObjectRefs = filteredPaths.map((path) => {
          const { name } = getNameAndExtension(path);
          const nameForInstallation = getPipelineNameForInstallation({
            pipelineName: name,
            dataStream,
            packageVersion: installablePackage.version,
          });
          return { id: nameForInstallation, type: ElasticsearchAssetType.ingestPipeline };
        });
        acc.push(...pipelineObjectRefs);
        return acc;
      }, [])
    : [];

  const topLevelPipelineRefs = topLevelPipelinePaths.map((path) => {
    const { name } = getNameAndExtension(path);
    const nameForInstallation = getPipelineNameForInstallation({
      pipelineName: name,
      packageVersion: installablePackage.version,
    });
    return { id: nameForInstallation, type: ElasticsearchAssetType.ingestPipeline };
  });

  pipelineRefs = [...pipelineRefs, ...topLevelPipelineRefs];

  // check that we don't duplicate the pipeline refs if the user is reinstalling
  const installedPkg = await getInstallationObject({
    savedObjectsClient,
    pkgName,
  });
  if (!installedPkg) throw new Error("integration wasn't found while installing pipelines");
  // remove the current pipeline refs, if any exist, associated with this version before saving new ones so no duplicates occur
  await deletePipelineRefs(
    savedObjectsClient,
    installedPkg.attributes.installed_es,
    pkgName,
    pkgVersion
  );
  await saveInstalledEsRefs(savedObjectsClient, installablePackage.name, pipelineRefs);
  const pipelines = dataStreams
    ? dataStreams.reduce<Array<Promise<EsAssetReference[]>>>((acc, dataStream) => {
        if (dataStream.ingest_pipeline) {
          acc.push(
            installAllPipelines({
              dataStream,
              esClient,
              logger,
              paths: pipelinePaths,
              installablePackage,
            })
          );
        }
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

  return await Promise.all(pipelines).then((results) => results.flat());
};

export function rewriteIngestPipeline(
  pipeline: string,
  substitutions: RewriteSubstitution[]
): string {
  substitutions.forEach((sub) => {
    const { source, target, templateFunction } = sub;
    // This fakes the use of the golang text/template expression {{SomeTemplateFunction 'some-param'}}
    // cf. https://github.com/elastic/beats/blob/master/filebeat/fileset/fileset.go#L294

    // "Standard style" uses '{{' and '}}' as delimiters
    const matchStandardStyle = `{{\\s?${templateFunction}\\s+['"]${source}['"]\\s?}}`;
    // "Beats style" uses '{<' and '>}' as delimiters because this is current practice in the beats project
    const matchBeatsStyle = `{<\\s?${templateFunction}\\s+['"]${source}['"]\\s?>}`;

    const regexStandardStyle = new RegExp(matchStandardStyle);
    const regexBeatsStyle = new RegExp(matchBeatsStyle);
    pipeline = pipeline.replace(regexStandardStyle, target).replace(regexBeatsStyle, target);
  });
  return pipeline;
}

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
  installablePackage: InstallablePackage;
}): Promise<EsAssetReference[]> {
  const pipelinePaths = dataStream
    ? paths.filter((path) => isDataStreamPipeline(path, dataStream.path))
    : paths;
  let pipelines: any[] = [];
  const substitutions: RewriteSubstitution[] = [];

  pipelinePaths.forEach((path) => {
    const { name, extension } = getNameAndExtension(path);
    const nameForInstallation = getPipelineNameForInstallation({
      pipelineName: name,
      dataStream,
      packageVersion: installablePackage.version,
    });
    const content = getAsset(path).toString('utf-8');
    pipelines.push({
      name,
      nameForInstallation,
      content,
      extension,
    });
    substitutions.push({
      source: name,
      target: nameForInstallation,
      templateFunction: 'IngestPipeline',
    });
  });

  pipelines = pipelines.map((pipeline) => {
    return {
      ...pipeline,
      contentForInstallation: rewriteIngestPipeline(pipeline.content, substitutions),
    };
  });

  const installationPromises = pipelines.map(async (pipeline) => {
    return installPipeline({ esClient, pipeline, installablePackage, logger });
  });

  return Promise.all(installationPromises);
}

async function installPipeline({
  esClient,
  logger,
  pipeline,
  installablePackage,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  pipeline: any;
  installablePackage?: InstallablePackage;
}): Promise<EsAssetReference> {
  const pipelineWithMetadata = appendMetadataToIngestPipeline({
    pipeline,
    packageName: installablePackage?.name,
  });

  const esClientParams = {
    id: pipelineWithMetadata.nameForInstallation,
    body: pipelineWithMetadata.contentForInstallation,
  };

  const esClientRequestOptions: TransportRequestOptions = {
    ignore: [404],
  };

  if (pipelineWithMetadata.extension === 'yml') {
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
    id: pipelineWithMetadata.nameForInstallation,
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

export const getPipelineNameForInstallation = ({
  pipelineName,
  dataStream,
  packageVersion,
}: {
  pipelineName: string;
  dataStream?: RegistryDataStream;
  packageVersion: string;
}): string => {
  if (dataStream !== undefined) {
    const isPipelineEntry = pipelineName === dataStream.ingest_pipeline;
    const suffix = isPipelineEntry ? '' : `-${pipelineName}`;
    // if this is the pipeline entry, don't add a suffix
    return `${dataStream.type}-${dataStream.dataset}-${packageVersion}${suffix}`;
  }
  // It's a top-level pipeline
  return `${packageVersion}-${pipelineName}`;
};
