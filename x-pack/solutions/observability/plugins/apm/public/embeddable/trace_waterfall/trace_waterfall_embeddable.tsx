/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { ApmTraceWaterfallEmbeddableProps } from './react_embeddable_factory';
import { useWaterfallFetcher } from '../../components/app/transaction_details/use_waterfall_fetcher';
import { Waterfall } from '../../components/app/transaction_details/waterfall_with_summary/waterfall_container/waterfall';
import { isPending } from '../../hooks/use_fetcher';

export function TraceWaterfallEmbeddable({
  entryTransactionId,
  rangeFrom,
  rangeTo,
  traceId,
  displayLimit,
}: ApmTraceWaterfallEmbeddableProps) {
  const waterfallFetchResult = useWaterfallFetcher({
    traceId,
    transactionId: entryTransactionId,
    start: rangeFrom,
    end: rangeTo,
    displayLimit,
  });
  return (
    <div>
      {isPending(waterfallFetchResult.status) ? (
        <span>
          {i18n.translate('xpack.apm.traceWaterfallEmbeddable.span.loadingLabel', {
            defaultMessage: 'Loading...',
          })}
        </span>
      ) : (
        <Waterfall showCriticalPath={false} waterfall={waterfallFetchResult.waterfall} />
      )}
    </div>
  );
}
