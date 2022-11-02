/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useTraceExplorerSamples } from '../../../hooks/use_trace_explorer_samples';
import { push, replace } from '../../shared/links/url_helpers';
import { useWaterfallFetcher } from '../transaction_details/use_waterfall_fetcher';
import { WaterfallWithSummary } from '../transaction_details/waterfall_with_summary';

export function TraceExplorerWaterfall() {
  const history = useHistory();

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

  return (
    <WaterfallWithSummary
      waterfallFetchResult={waterfallFetchResult}
      traceSamples={traceSamplesFetchResult.data.traceSamples}
      traceSamplesFetchStatus={traceSamplesFetchResult.status}
      environment={environment}
      onSampleClick={(sample) => {
        push(history, {
          query: {
            traceId: sample.traceId,
            transactionId: sample.transactionId,
            waterfallItemId: '',
          },
        });
      }}
      onTabClick={(nextDetailTab) => {
        push(history, {
          query: {
            detailTab: nextDetailTab,
          },
        });
      }}
      detailTab={detailTab}
      waterfallItemId={waterfallItemId}
      serviceName={
        waterfallFetchResult.waterfall.entryWaterfallTransaction?.doc.service
          .name
      }
      showCriticalPath={showCriticalPath}
      onShowCriticalPathChange={(nextShowCriticalPath) => {
        push(history, {
          query: {
            showCriticalPath: nextShowCriticalPath ? 'true' : 'false',
          },
        });
      }}
    />
  );
}
