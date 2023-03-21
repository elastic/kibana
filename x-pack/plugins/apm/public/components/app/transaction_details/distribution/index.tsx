/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { XYBrushEvent } from '@elastic/charts';
import { EuiSpacer } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useHistory } from 'react-router-dom';

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';

import { useWaterfallFetcher } from '../use_waterfall_fetcher';
import { WaterfallWithSummary } from '../waterfall_with_summary';

import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { DurationDistributionChartWithScrubber } from '../../../shared/charts/duration_distribution_chart_with_scrubber';
import { HeightRetainer } from '../../../shared/height_retainer';
import { fromQuery, push, toQuery } from '../../../shared/links/url_helpers';
import { TransactionTab } from '../waterfall_with_summary/transaction_tabs';
import { useTransactionDistributionChartData } from './use_transaction_distribution_chart_data';
import { TraceSamplesFetchResult } from '../../../../hooks/use_transaction_trace_samples_fetcher';

interface TransactionDistributionProps {
  onChartSelection: (event: XYBrushEvent) => void;
  onClearSelection: () => void;
  selection?: [number, number];
  traceSamplesFetchResult: TraceSamplesFetchResult;
}

export function TransactionDistribution({
  onChartSelection,
  onClearSelection,
  selection,
  traceSamplesFetchResult,
}: TransactionDistributionProps) {
  const { urlParams } = useLegacyUrlParams();
  const { traceId, transactionId } = urlParams;

  const {
    query: { rangeFrom, rangeTo, showCriticalPath, environment },
  } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view'
  );

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const history = useHistory();
  const waterfallFetchResult = useWaterfallFetcher({
    traceId,
    transactionId,
    start,
    end,
  });
  const { waterfallItemId, detailTab } = urlParams;

  const { serviceName } = useApmServiceContext();

  const markerCurrentEvent =
    waterfallFetchResult.waterfall.entryWaterfallTransaction?.doc.transaction
      .duration.us;

  const {
    chartData,
    hasData,
    percentileThresholdValue,
    status,
    totalDocCount,
  } = useTransactionDistributionChartData();

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

  const onTabClick = useCallback(
    (tab: TransactionTab) => {
      history.replace({
        ...history.location,
        search: fromQuery({
          ...toQuery(history.location.search),
          detailTab: tab,
        }),
      });
    },
    [history]
  );

  return (
    <HeightRetainer>
      <div data-test-subj="apmTransactionDistributionTabContent">
        <DurationDistributionChartWithScrubber
          onChartSelection={onChartSelection}
          onClearSelection={onClearSelection}
          selection={selection}
          status={status}
          markerCurrentEvent={markerCurrentEvent}
          chartData={chartData}
          totalDocCount={totalDocCount}
          hasData={hasData}
          percentileThresholdValue={percentileThresholdValue}
          eventType={ProcessorEvent.transaction}
        />

        <EuiSpacer size="s" />
        <WaterfallWithSummary
          environment={environment}
          onSampleClick={(sample) => {
            history.push({
              ...history.location,
              search: fromQuery({
                ...toQuery(history.location.search),
                transactionId: sample.transactionId,
                traceId: sample.traceId,
              }),
            });
          }}
          onTabClick={onTabClick}
          serviceName={serviceName}
          waterfallItemId={waterfallItemId}
          detailTab={detailTab as TransactionTab | undefined}
          waterfallFetchResult={waterfallFetchResult}
          traceSamplesFetchStatus={traceSamplesFetchResult.status}
          traceSamples={traceSamplesFetchResult.data?.traceSamples}
          showCriticalPath={showCriticalPath}
          onShowCriticalPathChange={onShowCriticalPathChange}
        />
      </div>
    </HeightRetainer>
  );
}
