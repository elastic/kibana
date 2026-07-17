/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProcessorEvent } from '@kbn/observability-plugin/common';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { getGenAiFields, hasGenAiData } from './get_genai_fields';
import type { GenAiFields } from './get_genai_fields';

interface UseGenAiDataParams {
  processorEvent: ProcessorEvent.span | ProcessorEvent.transaction;
  id: string;
  timestamp: string;
}

interface UseGenAiDataResult {
  genAi: GenAiFields | undefined;
  isGenAiSpan: boolean;
  isLoading: boolean;
}

export function useGenAiData({
  processorEvent,
  id,
  timestamp,
}: UseGenAiDataParams): UseGenAiDataResult {
  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!id) return;
      return callApmApi('GET /internal/apm/event_metadata/{processorEvent}/{id}', {
        params: {
          path: { processorEvent, id },
          query: { start: timestamp, end: timestamp },
        },
      });
    },
    [processorEvent, id, timestamp]
  );

  const metadata = data?.metadata ?? {};
  const isGenAiSpan = hasGenAiData(metadata);

  return {
    genAi: isGenAiSpan ? getGenAiFields(metadata) : undefined,
    isGenAiSpan,
    isLoading: status === FETCH_STATUS.LOADING,
  };
}
