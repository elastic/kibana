/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiSpacer, EuiTitle } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { XYBrushArea } from '@elastic/charts';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useTransactionDistributionFetcher } from '../../../hooks/use_transaction_distribution_fetcher';
import { TransactionCharts } from '../../shared/charts/transaction_charts';
import { HeightRetainer } from '../../shared/HeightRetainer';
import { fromQuery, toQuery } from '../../shared/Links/url_helpers';
import { MlLatencyCorrelations } from '../correlations/ml_latency_correlations_page';
import { useWaterfallFetcher } from './use_waterfall_fetcher';
import { WaterfallWithSummary } from './waterfall_with_summary';

interface Sample {
  traceId: string;
  transactionId: string;
}

export function TransactionDetails() {
  const { urlParams } = useUrlParams();
  const history = useHistory();

  const {
    waterfall,
    exceedsMax,
    status: waterfallStatus,
  } = useWaterfallFetcher();

  const { path, query } = useApmParams(
    '/services/:serviceName/transactions/view'
  );

  const apmRouter = useApmRouter();

  const { transactionName } = query;

  const { distributionData } = useTransactionDistributionFetcher({
    transactionName,
  });

  useBreadcrumb({
    title: transactionName,
    href: apmRouter.link('/services/:serviceName/transactions/view', {
      path,
      query,
    }),
  });

  const { sampleRangeFrom, sampleRangeTo } = urlParams;

  const traceSamples: Sample[] = useMemo(() => {
    return distributionData.hits.map((hit) => ({
      transactionId: hit._source.transaction.id,
      traceId: hit._source.trace.id,
    }));
  }, [distributionData.hits]);

  const selectSampleFromChartSelection = (selection: XYBrushArea) => {
    if (selection !== undefined) {
      const { x } = selection;
      if (Array.isArray(x)) {
        history.push({
          ...history.location,
          search: fromQuery({
            ...toQuery(history.location.search),
            sampleRangeFrom: Math.round(x[0]),
            sampleRangeTo: Math.round(x[1]),
          }),
        });
      }
    }
  };

  const clearChartSelecton = () => {
    const currentQuery = toQuery(history.location.search);
    delete currentQuery.sampleRangeFrom;
    delete currentQuery.sampleRangeTo;

    const firstSample = distributionData.buckets[0].samples[0];
    currentQuery.transactionId = firstSample?.transactionId;
    currentQuery.traceId = firstSample?.traceId;

    history.push({
      ...history.location,
      search: fromQuery(currentQuery),
    });
  };

  return (
    <>
      <EuiSpacer size="s" />

      <EuiTitle>
        <h2>{transactionName}</h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      <ChartPointerEventContextProvider>
        <TransactionCharts />
      </ChartPointerEventContextProvider>

      <EuiHorizontalRule size="full" margin="l" />

      <MlLatencyCorrelations
        onChartSelection={selectSampleFromChartSelection}
        onClearSelection={clearChartSelecton}
        selection={
          sampleRangeFrom !== undefined && sampleRangeTo !== undefined
            ? [sampleRangeFrom, sampleRangeTo]
            : undefined
        }
      />
      <EuiSpacer size="s" />

      <HeightRetainer>
        <WaterfallWithSummary
          urlParams={urlParams}
          waterfall={waterfall}
          isLoading={waterfallStatus === FETCH_STATUS.LOADING}
          exceedsMax={exceedsMax}
          traceSamples={traceSamples}
        />
      </HeightRetainer>
    </>
  );
}
