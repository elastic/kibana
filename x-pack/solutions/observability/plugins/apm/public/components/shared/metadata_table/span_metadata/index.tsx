/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { Span } from '../../../../../typings/es_schemas/ui/span';
import { getSectionsFromFields } from '../helper';
import { MetadataTable } from '..';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';

interface PrefetchedMetadata {
  metadata: Record<string, unknown>;
  isLoading: boolean;
}

interface Props {
  span: Span;
  /** Pre-fetched metadata from the flyout body. When provided the internal fetch is skipped. */
  prefetchedMetadata?: PrefetchedMetadata;
}

export function SpanMetadata({ span, prefetchedMetadata }: Props) {
  const spanId = span.span?.id;

  const { data: spanEvent, status } = useFetcher(
    (callApmApi) => {
      if (prefetchedMetadata || !spanId) {
        return;
      }

      return callApmApi('GET /internal/apm/event_metadata/{processorEvent}/{id}', {
        params: {
          path: {
            processorEvent: ProcessorEvent.span,
            id: spanId,
          },
          query: {
            start: span['@timestamp'],
            end: span['@timestamp'],
          },
        },
      });
    },
    [span, spanId, prefetchedMetadata]
  );

  const isLoading = prefetchedMetadata
    ? prefetchedMetadata.isLoading
    : status === FETCH_STATUS.LOADING;

  const sections = useMemo(
    () => getSectionsFromFields(prefetchedMetadata?.metadata ?? spanEvent?.metadata ?? {}),
    [prefetchedMetadata, spanEvent?.metadata]
  );

  return <MetadataTable sections={sections} isLoading={isLoading} />;
}
