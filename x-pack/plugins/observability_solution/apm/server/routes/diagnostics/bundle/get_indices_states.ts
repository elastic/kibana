/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { APMIndices } from '@kbn/apm-data-access-plugin/server';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import { getApmIndexTemplateNames } from '../helpers/get_apm_index_template_names';
import { getFieldCaps } from './get_field_caps';
import { getIndicesAndIngestPipelines } from './get_indices';

export async function getIndicesStates({
  esClient,
  apmIndices,
}: {
  esClient: ElasticsearchClient;
  apmIndices: APMIndices;
}) {
  const { indices, ingestPipelines } = await getIndicesAndIngestPipelines({
    esClient,
    apmIndices,
  });

  const indicesWithPipelineId = Object.entries(indices).map(([key, value]) => ({
    index: key,
    dataStream: value.data_stream,
    pipelineId: value.settings?.index?.default_pipeline,
  }));

  const fieldCaps = await getFieldCaps({ esClient, apmIndices });

  const invalidFieldMappings = Object.values(fieldCaps.fields[SERVICE_NAME] ?? {}).filter(
    ({ type }): boolean => type !== 'keyword'
  );

  const items = indicesWithPipelineId.map(({ index, dataStream, pipelineId }) => {
    const hasObserverVersionProcessor = pipelineId
      ? ingestPipelines[pipelineId]?.processors?.some((processor) => {
          return (
            processor?.grok?.field === 'observer.version' &&
            processor?.grok?.patterns[0] ===
              '%{DIGITS:observer.version_major:int}.%{DIGITS:observer.version_minor:int}.%{DIGITS:observer.version_patch:int}(?:[-+].*)?'
          );
        })
      : false;

    const invalidFieldMapping = invalidFieldMappings.find((fieldMappings) =>
      fieldMappings.indices?.includes(index)
    );

    const isValidFieldMappings = invalidFieldMapping === undefined;
    const isValidIngestPipeline =
      hasObserverVersionProcessor === true && validateIngestPipelineName(dataStream, pipelineId);

    return {
      isValid: isValidFieldMappings && isValidIngestPipeline,
      fieldMappings: {
        isValid: isValidFieldMappings,
        invalidType: invalidFieldMapping?.type,
      },
      ingestPipeline: {
        isValid: isValidIngestPipeline,
        id: pipelineId,
      },
      index,
      dataStream,
    };
  });

  const invalidIndices = items.filter((item) => !item.isValid);
  const validIndices = items.filter((item) => item.isValid);

  return { invalidIndices, validIndices, indices, ingestPipelines, fieldCaps };
}

export function validateIngestPipelineName(
  dataStream: string | undefined,
  ingestPipelineId: string | undefined
) {
  if (!dataStream || !ingestPipelineId) {
    return false;
  }

  const indexTemplateNames = getApmIndexTemplateNames();
  return Object.values(indexTemplateNames)
    .flat()
    .some(
      (indexTemplateName) =>
        dataStream.startsWith(indexTemplateName) && ingestPipelineId.startsWith(indexTemplateName)
    );
}
