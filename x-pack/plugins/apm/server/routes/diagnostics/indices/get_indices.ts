/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, uniq } from 'lodash';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { validateIngestPipelineName } from '../../../../common/diagnostics/get_default_index_template_names';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getUniqueApmIndices } from '../index_templates/get_matching_index_templates';

export async function getIndicesWithStatuses({
  apmEventClient,
}: {
  apmEventClient: APMEventClient;
}) {
  const indicesWithPipelineId = await getIndicesWithPipelineId({
    apmEventClient,
  });
  const pipelineIds = compact(
    uniq(indicesWithPipelineId.map(({ pipelineId }) => pipelineId))
  );

  const ingestPipelines = await apmEventClient.getIngestPipeline(
    'get_ingest_pipeline',
    {
      id: pipelineIds.join(','),
      filter_path: ['*.processors.grok.field', '*.processors.grok.patterns'],
    }
  );

  const res = await apmEventClient.fieldCaps('diagnostics_field_caps', {
    apm: { events: [ProcessorEvent.metric, ProcessorEvent.transaction] },
    fields: [SERVICE_NAME],
    filter_path: ['fields'],
  });

  const invalidFieldMappings = Object.values(
    res.fields[SERVICE_NAME] ?? {}
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

async function getIndicesWithPipelineId({
  apmEventClient,
}: {
  apmEventClient: APMEventClient;
}) {
  const apmIndices = getUniqueApmIndices(apmEventClient.indices);

  // get indices settings
  const res = await apmEventClient.getIndices('get_apm_indices', {
    index: apmIndices,
    filter_path: [
      '*.settings.index.default_pipeline',
      '*.data_stream',
      '*.settings.index.provided_name',
    ],
  });

  return Object.entries(res).map(([key, value]) => ({
    index: key,
    dataStream: value.data_stream,
    pipelineId: value.settings?.index?.default_pipeline,
  }));
}
