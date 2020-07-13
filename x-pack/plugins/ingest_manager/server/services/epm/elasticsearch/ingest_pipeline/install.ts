/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import {
  EsAssetReference,
  Dataset,
  ElasticsearchAssetType,
  RegistryPackage,
} from '../../../../types';
import * as Registry from '../../registry';
import { CallESAsCurrentUser } from '../../../../types';
import { saveInstalledEsRefs } from '../../packages/install';

interface RewriteSubstitution {
  source: string;
  target: string;
  templateFunction: string;
}

export const installPipelines = async (
  registryPackage: RegistryPackage,
  paths: string[],
  callCluster: CallESAsCurrentUser,
  savedObjectsClient: SavedObjectsClientContract
) => {
  // unlike other ES assets, pipeline names are versioned so after a template is updated
  // it can be created pointing to the new template, without removing the old one and effecting data
  // so do not remove the currently installed pipelines here
  const datasets = registryPackage.datasets;
  const pipelinePaths = paths.filter((path) => isPipeline(path));
  if (datasets) {
    const pipelines = datasets.reduce<Array<Promise<EsAssetReference[]>>>((acc, dataset) => {
      if (dataset.ingest_pipeline) {
        acc.push(
          installPipelinesForDataset({
            dataset,
            callCluster,
            paths: pipelinePaths,
            pkgVersion: registryPackage.version,
          })
        );
      }
      return acc;
    }, []);
    const pipelinesToSave = await Promise.all(pipelines).then((results) => results.flat());
    return saveInstalledEsRefs(savedObjectsClient, registryPackage.name, pipelinesToSave);
  }
  return [];
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

export async function installPipelinesForDataset({
  callCluster,
  pkgVersion,
  paths,
  dataset,
}: {
  callCluster: CallESAsCurrentUser;
  pkgVersion: string;
  paths: string[];
  dataset: Dataset;
}): Promise<EsAssetReference[]> {
  const pipelinePaths = paths.filter((path) => isDatasetPipeline(path, dataset.path));
  let pipelines: any[] = [];
  const substitutions: RewriteSubstitution[] = [];

  pipelinePaths.forEach((path) => {
    const { name, extension } = getNameAndExtension(path);
    const nameForInstallation = getPipelineNameForInstallation({
      pipelineName: name,
      dataset,
      packageVersion: pkgVersion,
    });
    const content = Registry.getAsset(path).toString('utf-8');
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
    return installPipeline({ callCluster, pipeline });
  });

  return Promise.all(installationPromises);
}

async function installPipeline({
  callCluster,
  pipeline,
}: {
  callCluster: CallESAsCurrentUser;
  pipeline: any;
}): Promise<EsAssetReference> {
  const callClusterParams: {
    method: string;
    path: string;
    ignore: number[];
    body: any;
    headers?: any;
  } = {
    method: 'PUT',
    path: `/_ingest/pipeline/${pipeline.nameForInstallation}`,
    ignore: [404],
    body: pipeline.contentForInstallation,
  };
  if (pipeline.extension === 'yml') {
    callClusterParams.headers = { ['Content-Type']: 'application/yaml' };
  }

  // This uses the catch-all endpoint 'transport.request' because we have to explicitly
  // set the Content-Type header above for sending yml data. Setting the headers is not
  // exposed in the convenience endpoint 'ingest.putPipeline' of elasticsearch-js-legacy
  // which we could otherwise use.
  // See src/core/server/elasticsearch/api_types.ts for available endpoints.
  await callCluster('transport.request', callClusterParams);
  return { id: pipeline.nameForInstallation, type: ElasticsearchAssetType.ingestPipeline };
}

const isDirectory = ({ path }: Registry.ArchiveEntry) => path.endsWith('/');

const isDatasetPipeline = (path: string, datasetName: string) => {
  const pathParts = Registry.pathParts(path);
  return (
    !isDirectory({ path }) &&
    pathParts.type === ElasticsearchAssetType.ingestPipeline &&
    pathParts.dataset !== undefined &&
    datasetName === pathParts.dataset
  );
};
const isPipeline = (path: string) => {
  const pathParts = Registry.pathParts(path);
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
  dataset,
  packageVersion,
}: {
  pipelineName: string;
  dataset: Dataset;
  packageVersion: string;
}): string => {
  const isPipelineEntry = pipelineName === dataset.ingest_pipeline;
  const suffix = isPipelineEntry ? '' : `-${pipelineName}`;
  // if this is the pipeline entry, don't add a suffix
  return `${dataset.type}-${dataset.name}-${packageVersion}${suffix}`;
};
