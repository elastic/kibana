/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import React, { useCallback, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useTraceExplorerSamples } from '../../../hooks/use_trace_explorer_samples';
import { ResettingHeightRetainer } from '../../shared/height_retainer/resetting_height_container';
import { push, replace } from '../../shared/links/url_helpers';
import { useWaterfallFetcher } from '../transaction_details/use_waterfall_fetcher';
import { WaterfallWithSummary } from '../transaction_details/waterfall_with_summary';
import type { TransactionTab } from '../transaction_details/waterfall_with_summary/transaction_tabs';

export function TraceExplorerWaterfall() {
  const history = useHistory();
  const { onPageReady } = usePerformanceContext();
  const traceSamplesFetchResult = useTraceExplorerSamples();

  const {
    query: {
      traceId,
      transactionId,
      waterfallItemId,
      rangeFrom,
      rangeTo,
      environment,
      showCriticalPath,
      detailTab,
    },
  } = useApmParams('/traces/explorer/waterfall');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  useEffect(() => {
    const nextSample = traceSamplesFetchResult.data?.traceSamples[0];
    const nextWaterfallItemId = '';
    replace(history, {
      query: {
        traceId: nextSample?.traceId ?? '',
        transactionId: nextSample?.transactionId ?? '',
        waterfallItemId: nextWaterfallItemId,
      },
    });
  }, [traceSamplesFetchResult.data, history]);

  const waterfallFetchResult = useWaterfallFetcher({
    traceId,
    transactionId,
    start,
    end,
  });

  useEffect(() => {
    if (waterfallFetchResult.status === FETCH_STATUS.SUCCESS) {
      onPageReady({
        meta: {
          rangeFrom,
          rangeTo,
        },
        customMetrics: {
          key1: 'traceDocsTotal',
          value1: waterfallFetchResult.waterfall.traceDocsTotal,
        },
      });
    }
  }, [waterfallFetchResult, onPageReady, rangeFrom, rangeTo]);

  const onSampleClick = useCallback(
    (sample: any) => {
      push(history, {
        query: {
          traceId: sample.traceId,
          transactionId: sample.transactionId,
          waterfallItemId: '',
        },
      });
    },
    [history]
  );

  const onTabClick = useCallback(
    (nextDetailTab: TransactionTab) => {
      push(history, {
        query: {
          detailTab: nextDetailTab,
        },
      });
    },
    [history]
  );

  const onShowCriticalPathChange = useCallback(
    (nextShowCriticalPath: boolean) => {
      push(history, {
        query: {
          showCriticalPath: nextShowCriticalPath ? 'true' : 'false',
        },
      });
    },
    [history]
  );

  const isWaterfallLoading =
    waterfallFetchResult.status === FETCH_STATUS.LOADING &&
    !waterfallFetchResult.waterfall.entryWaterfallTransaction;

  return (
    <ResettingHeightRetainer reset={!isWaterfallLoading}>
      <WaterfallWithSummary
        waterfallFetchResult={waterfallFetchResult.waterfall}
        waterfallFetchStatus={waterfallFetchResult.status}
        traceSamples={traceSamplesFetchResult.data.traceSamples}
        traceSamplesFetchStatus={traceSamplesFetchResult.status}
        environment={environment}
        onSampleClick={onSampleClick}
        onTabClick={onTabClick}
        detailTab={detailTab}
        waterfallItemId={waterfallItemId}
        serviceName={waterfallFetchResult.waterfall.entryWaterfallTransaction?.doc.service.name}
        showCriticalPath={showCriticalPath}
        onShowCriticalPathChange={onShowCriticalPathChange}
      />
    </ResettingHeightRetainer>
  );
}
