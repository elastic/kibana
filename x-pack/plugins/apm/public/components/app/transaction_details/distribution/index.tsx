/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { XYBrushEvent } from '@elastic/charts';
import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useHistory } from 'react-router-dom';

import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';

import type { TabContentProps } from '../types';
import { useWaterfallFetcher } from '../use_waterfall_fetcher';
import { WaterfallWithSummary } from '../waterfall_with_summary';

import { ProcessorEvent } from '../../../../../common/processor_event';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { DurationDistributionChartWithScrubber } from '../../../shared/charts/duration_distribution_chart_with_scrubber';
import { HeightRetainer } from '../../../shared/height_retainer';
import { fromQuery, toQuery } from '../../../shared/links/url_helpers';
import { TransactionTab } from '../waterfall_with_summary/transaction_tabs';
import { useTransactionDistributionChartData } from './use_transaction_distribution_chart_data';

interface TransactionDistributionProps {
  onChartSelection: (event: XYBrushEvent) => void;
  onClearSelection: () => void;
  selection?: [number, number];
  traceSamples: TabContentProps['traceSamples'];
  traceSamplesStatus: FETCH_STATUS;
}

export function TransactionDistribution({
  onChartSelection,
  onClearSelection,
  selection,
  traceSamples,
  traceSamplesStatus,
}: TransactionDistributionProps) {
  const { urlParams } = useLegacyUrlParams();
  const { traceId, transactionId } = urlParams;

  const {
    query: { rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/transactions/view');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const history = useHistory();
  const { waterfall, status: waterfallStatus } = useWaterfallFetcher({
    traceId,
    transactionId,
    start,
    end,
  });
  const { waterfallItemId, detailTab } = urlParams;

  const {
    query: { environment },
  } = useApmParams('/services/{serviceName}/transactions/view');

  const { serviceName } = useApmServiceContext();
  const isLoading =
    waterfallStatus === FETCH_STATUS.LOADING ||
    traceSamplesStatus === FETCH_STATUS.LOADING;

  const markerCurrentEvent =
    waterfall.entryWaterfallTransaction?.doc.transaction.duration.us;

  const { chartData, hasData, percentileThresholdValue, status } =
    useTransactionDistributionChartData();

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
          onTabClick={(tab) => {
            history.replace({
              ...history.location,
              search: fromQuery({
                ...toQuery(history.location.search),
                detailTab: tab,
              }),
            });
          }}
          serviceName={serviceName}
          waterfallItemId={waterfallItemId}
          detailTab={detailTab as TransactionTab | undefined}
          waterfall={waterfall}
          isLoading={isLoading}
          traceSamples={traceSamples}
        />
      </div>
    </HeightRetainer>
  );
}
