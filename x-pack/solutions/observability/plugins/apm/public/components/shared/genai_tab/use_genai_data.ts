/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ProcessorEvent } from '@kbn/observability-plugin/common';
import { getGenAiFields, hasGenAiData, type GenAiFields } from '@kbn/genai-common';
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
      }).then(({ metadata }) => ({ id, metadata }));
    },
    [processorEvent, id, timestamp]
  );

  // The fetcher keeps the previous event's data and status until the next request starts, and
  // keeps both when `id` is cleared, so data fetched for another event counts as loading. A failed
  // request clears the data, which leaves nothing to compare.
  const isOtherEvent = eventMetadata !== undefined && eventMetadata.id !== id;
  const isMetadataLoading = isPending(metadataStatus) || isOtherEvent;

  return useMemo(() => {
    const metadata = (isOtherEvent ? undefined : eventMetadata?.metadata) ?? {};
    const isGenAiSpan = hasGenAiData(metadata);

    return {
      metadata,
      isMetadataLoading,
      isGenAiSpan,
      genAi: isGenAiSpan ? getGenAiFields(metadata) : undefined,
    };
  }, [eventMetadata, isMetadataLoading, isOtherEvent]);
}
