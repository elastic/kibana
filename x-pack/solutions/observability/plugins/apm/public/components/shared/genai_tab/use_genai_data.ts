/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { GenAiFields } from '@kbn/apm-ui-shared';
import { getGenAiFields, hasGenAiData } from '@kbn/apm-ui-shared';
import { useFetcher, isPending } from '../../../hooks/use_fetcher';

interface UseGenAiDataParams {
  processorEvent: ProcessorEvent.transaction | ProcessorEvent.span;
  id?: string;
  timestamp?: string;
}

interface UseGenAiDataResult {
  metadata: Record<string, unknown>;
  isMetadataLoading: boolean;
  isGenAiSpan: boolean;
  genAi: GenAiFields | undefined;
}

/**
 * Fetches the event metadata for a transaction/span and derives the GenAI
 * fields from it. The returned `metadata` can be passed on as
 * `prefetchedMetadata` to the metadata table so the event is only fetched once.
 */
export function useGenAiData({
  processorEvent,
  id,
  timestamp,
}: UseGenAiDataParams): UseGenAiDataResult {
  const { data: eventMetadata, status: metadataStatus } = useFetcher(
    (callApmApi) => {
      if (!id || !timestamp) return;
      return callApmApi('GET /internal/apm/event_metadata/{processorEvent}/{id}', {
        params: {
          path: { processorEvent, id },
          query: { start: timestamp, end: timestamp },
        },
      });
    },
    [processorEvent, id, timestamp]
  );

  const isMetadataLoading = isPending(metadataStatus);

  return useMemo(() => {
    const metadata = eventMetadata?.metadata ?? {};
    const isGenAiSpan = hasGenAiData(metadata);

    return {
      metadata,
      isMetadataLoading,
      isGenAiSpan,
      genAi: isGenAiSpan ? getGenAiFields(metadata) : undefined,
    };
  }, [eventMetadata, isMetadataLoading]);
}
