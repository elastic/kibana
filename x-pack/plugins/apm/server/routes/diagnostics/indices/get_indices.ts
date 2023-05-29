/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, uniq } from 'lodash';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { validateIngestPipelineName } from '../../../../common/diagnostics/get_default_index_template_names';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import { ApmIndicesConfig } from '../../settings/apm_indices/get_apm_indices';

function flattenIndices(indices: string[]) {
  return uniq(indices.flatMap((index): string[] => index.split(',')));
}

export async function getIndicesWithStatuses({
  esClient,
  apmIndices,
}: {
  esClient: ElasticsearchClient;
  apmIndices: ApmIndicesConfig;
}) {
  const indicesRes = await esClient.indices.get({
    index: flattenIndices([
      apmIndices.error,
      apmIndices.metric,
      apmIndices.span,
      apmIndices.transaction,
    ]),
    filter_path: [
      '*.settings.index.default_pipeline',
      '*.data_stream',
      '*.settings.index.provided_name',
    ],
  });

  const indicesWithPipelineId = Object.entries(indicesRes).map(
    ([key, value]) => ({
      index: key,
      dataStream: value.data_stream,
      pipelineId: value.settings?.index?.default_pipeline,
    })
  );

  const pipelineIds = compact(
    uniq(indicesWithPipelineId.map(({ pipelineId }) => pipelineId))
  );

  const ingestPipelines = await esClient.ingest.getPipeline({
    id: pipelineIds.join(','),
    filter_path: ['*.processors.grok.field', '*.processors.grok.patterns'],
  });

  const fieldCapsRes = await esClient.fieldCaps({
    index: flattenIndices([apmIndices.metric, apmIndices.transaction]),
    fields: [SERVICE_NAME],
    filter_path: ['fields'],
  });

  const invalidFieldMappings = Object.values(
    fieldCapsRes.fields[SERVICE_NAME] ?? {}
  ).filter(({ type }): boolean => type !== 'keyword');

  const items = indicesWithPipelineId.map(
    ({ index, dataStream, pipelineId }) => {
      const hasObserverVersionProcessor = pipelineId
        ? ingestPipelines[pipelineId]?.processors?.some((processor) => {
            return (
              processor?.grok?.field === 'observer.version' &&
              processor?.grok?.patterns[0] ===
                '%{DIGITS:observer.version_major:int}.%{DIGITS:observer.version_minor:int}.%{DIGITS:observer.version_patch:int}(?:[-+].*)?'
            );
          })
        : false;

      const invalidFieldMapping = invalidFieldMappings.find(({ indices }) =>
        indices?.includes(index)
      );

      const isValidFieldMappings = invalidFieldMapping === undefined;
      const isValidIngestPipeline =
        hasObserverVersionProcessor === true &&
        validateIngestPipelineName(dataStream, pipelineId);

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
    }
  );

  const invalidItems = items.filter((item) => !item.isValid);
  const validItems = items.filter((item) => item.isValid);

  return { invalidItems, validItems };
}
