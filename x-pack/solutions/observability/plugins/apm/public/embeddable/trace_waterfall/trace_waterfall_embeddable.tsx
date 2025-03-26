/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useWaterfallFetcher } from '../../components/app/transaction_details/use_waterfall_fetcher';
import { Waterfall } from '../../components/app/transaction_details/waterfall_with_summary/waterfall_container/waterfall';
import { isPending } from '../../hooks/use_fetcher';
import type { ApmTraceWaterfallEmbeddableProps } from './react_embeddable_factory';
import { WaterfallLegends } from '../../components/app/transaction_details/waterfall_with_summary/waterfall_container/waterfall_legends';

export function TraceWaterfallEmbeddable({
  serviceName,
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
  });

  if (isPending(waterfallFetchResult.status)) {
    return (
      <EuiFlexGroup direction="column" alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>
            {i18n.translate(
              'xpack.apm.traceWaterfallEmbeddable.loadingTraceWaterfallSkeletonTextLabel',
              { defaultMessage: 'Loading trace waterfall' }
            )}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const { legends, colorBy } = waterfallFetchResult.waterfall;

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <WaterfallLegends serviceName={serviceName} legends={legends} type={colorBy} />
      </EuiFlexItem>
      <EuiFlexItem>
        <Waterfall
          showCriticalPath={false}
          waterfall={waterfallFetchResult.waterfall}
          displayLimit={displayLimit}
          isEmbeddable
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
