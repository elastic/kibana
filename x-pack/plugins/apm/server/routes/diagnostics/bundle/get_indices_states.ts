/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FieldCapsResponse,
  IndicesGetResponse,
  IngestGetPipelineResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import { getApmIndexTemplatePrefixes } from '../get_apm_index_template_prefixes';

export function getIndicesStates({
  indices,
  fieldCaps,
  ingestPipelines,
}: {
  indices: IndicesGetResponse;
  fieldCaps: FieldCapsResponse;
  ingestPipelines: IngestGetPipelineResponse;
}) {
  const indicesWithPipelineId = Object.entries(indices).map(([key, value]) => ({
    index: key,
    dataStream: value.data_stream,
    pipelineId: value.settings?.index?.default_pipeline,
  }));

  const invalidFieldMappings = Object.values(
    fieldCaps.fields[SERVICE_NAME] ?? {}
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

      const invalidFieldMapping = invalidFieldMappings.find((fieldMappings) =>
        fieldMappings.indices?.includes(index)
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

  const invalidIndices = items.filter((item) => !item.isValid);
  const validIndices = items.filter((item) => item.isValid);

  return { invalidIndices, validIndices };
}

export function validateIngestPipelineName(
  dataStream: string | undefined,
  ingestPipelineId: string | undefined
) {
  if (!dataStream || !ingestPipelineId) {
    return false;
  }

  const indexTemplatePrefixes = getApmIndexTemplatePrefixes();
  return indexTemplatePrefixes.some(
    (prefix) =>
      dataStream.startsWith(prefix) && ingestPipelineId.startsWith(prefix)
  );
}
