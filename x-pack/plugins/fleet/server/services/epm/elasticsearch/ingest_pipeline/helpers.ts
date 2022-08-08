/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { safeDump, safeLoad } from 'js-yaml';

import { ElasticsearchAssetType } from '../../../../types';
import type { RegistryDataStream } from '../../../../types';
import { getPathParts } from '../../archive';

import { getPipelineNameForDatastream } from '../../../../../common/services';

import type { PipelineInstall, RewriteSubstitution } from './types';

export const isTopLevelPipeline = (path: string) => {
  const pathParts = getPathParts(path);
  return (
    pathParts.type === ElasticsearchAssetType.ingestPipeline && pathParts.dataset === undefined
  );
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
    return `${getPipelineNameForDatastream({ dataStream, packageVersion })}${suffix}`;
  }
  // It's a top-level pipeline
  return `${packageVersion}-${pipelineName}`;
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

function mutatePipelineContentWithNewProcessor(jsonPipelineContent: any, processor: any) {
  if (!jsonPipelineContent.processors) {
    jsonPipelineContent.processors = [];
  }

  jsonPipelineContent.processors.push(processor);
}

export function addCustomPipelineProcessor(pipeline: PipelineInstall): PipelineInstall {
  if (!pipeline.customIngestPipelineNameForInstallation) {
    return pipeline;
  }

  const customPipelineProcessor = {
    pipeline: {
      name: pipeline.customIngestPipelineNameForInstallation,
      ignore_missing_pipeline: true,
    },
  };

  if (pipeline.extension === 'yml') {
    const parsedPipelineContent = safeLoad(pipeline.contentForInstallation);
    mutatePipelineContentWithNewProcessor(parsedPipelineContent, customPipelineProcessor);
    return {
      ...pipeline,
      contentForInstallation: `---\n${safeDump(parsedPipelineContent)}`,
    };
  }

  const parsedPipelineContent = JSON.parse(pipeline.contentForInstallation);
  mutatePipelineContentWithNewProcessor(parsedPipelineContent, customPipelineProcessor);

  return {
    ...pipeline,
    contentForInstallation: JSON.stringify(parsedPipelineContent),
  };
}
