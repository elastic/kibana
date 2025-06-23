/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FocusedTraceWaterfall } from '../../components/shared/focused_trace_waterfall';
import { isPending, useFetcher } from '../../hooks/use_fetcher';
import { Loading } from './loading';
import type { ApmTraceWaterfallEmbeddableFocusedProps } from './react_embeddable_factory';
export function FocusedTraceWaterfallEmbeddable({
  rangeFrom,
  rangeTo,
  traceId,
  docId,
}: ApmTraceWaterfallEmbeddableFocusedProps) {
  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/traces/{traceId}/{docId}', {
        params: {
          path: { traceId, docId },
          query: { start: rangeFrom, end: rangeTo },
        },
      });
    },
    [docId, rangeFrom, rangeTo, traceId]
  );

  if (isPending(status)) {
    return <Loading />;
  }

  if (data === undefined) {
    return (
      <EuiText>
        {i18n.translate(
          'xpack.apm.focusedTraceWaterfallEmbeddable.traceWaterfallCouldNotTextLabel',
          { defaultMessage: 'Trace waterfall could not be loaded' }
        )}
      </EuiText>
    );
  }

  return <FocusedTraceWaterfall items={data} />;
}
