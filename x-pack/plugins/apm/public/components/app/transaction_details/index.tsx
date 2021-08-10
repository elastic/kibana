/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTabs, EuiTab, EuiTitle } from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { XYBrushArea } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
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
import { MlErrorCorrelations } from '../correlations/ml_error_correlations';
import { MlLatencyCorrelations } from '../correlations/ml_latency_correlations_page';
import { useWaterfallFetcher } from './use_waterfall_fetcher';
import { WaterfallWithSummary } from './waterfall_with_summary';

interface Sample {
  traceId: string;
  transactionId: string;
}

interface TabContentProps {
  selectSampleFromChartSelection: (selection: XYBrushArea) => void;
  clearChartSelection: () => void;
  sampleRangeFrom?: number;
  sampleRangeTo?: number;
  traceSamples: Sample[];
}

function TraceSamplesTab({
  selectSampleFromChartSelection,
  clearChartSelection,
  sampleRangeFrom,
  sampleRangeTo,
  traceSamples,
}: TabContentProps) {
  const { urlParams } = useUrlParams();

  const {
    waterfall,
    exceedsMax,
    status: waterfallStatus,
  } = useWaterfallFetcher();

  return (
    <>
      <MlLatencyCorrelations
        correlationAnalysisEnabled={false}
        onChartSelection={selectSampleFromChartSelection}
        onClearSelection={clearChartSelection}
        selection={
          sampleRangeFrom !== undefined && sampleRangeTo !== undefined
            ? [sampleRangeFrom, sampleRangeTo]
            : undefined
        }
        markerCurrentTransaction={
          waterfall.entryWaterfallTransaction?.doc.transaction.duration.us
        }
      />
      <EuiSpacer size="s" />

      <WaterfallWithSummary
        urlParams={urlParams}
        waterfall={waterfall}
        isLoading={waterfallStatus === FETCH_STATUS.LOADING}
        exceedsMax={exceedsMax}
        traceSamples={traceSamples}
      />
    </>
  );
}

function LatencyCorrelationsTab({
  selectSampleFromChartSelection,
  clearChartSelection,
  sampleRangeFrom,
  sampleRangeTo,
}: TabContentProps) {
  return <MlLatencyCorrelations correlationAnalysisEnabled={true} />;
}

const traceSamplesTab = {
  key: 'traceSamples',
  label: i18n.translate('xpack.apm.transactionDetails.tabs.traceSamplesLabel', {
    defaultMessage: 'Trace samples',
  }),
  component: TraceSamplesTab,
};
const errorRateTab = {
  key: 'errorRate',
  label: i18n.translate('xpack.apm.transactionDetails.tabs.errorRateLabel', {
    defaultMessage: 'Failing transactions',
  }),
  component: () => <MlErrorCorrelations onClose={() => {}} />,
};
const latencyCorrelationsTab = {
  key: 'latencyCorrelations',
  label: i18n.translate('xpack.apm.transactionDetails.tabs.latencyLabel', {
    defaultMessage: 'Latency correlations analysis',
  }),
  component: LatencyCorrelationsTab,
};
const tabs = [traceSamplesTab, latencyCorrelationsTab, errorRateTab];

export function TransactionDetails() {
  const { urlParams } = useUrlParams();
  const history = useHistory();

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

  const clearChartSelection = () => {
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

  const [currentTab, setCurrentTab] = useState(traceSamplesTab.key);
  const { component: TabContent } =
    tabs.find((tab) => tab.key === currentTab) ?? traceSamplesTab;

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

      <EuiSpacer size="m" />

      <EuiTabs>
        {tabs.map(({ key, label }) => (
          <EuiTab
            key={key}
            isSelected={key === currentTab}
            onClick={() => {
              setCurrentTab(key);
            }}
          >
            {label}
          </EuiTab>
        ))}
      </EuiTabs>

      <EuiSpacer size="m" />

      <HeightRetainer>
        <TabContent
          {...{
            selectSampleFromChartSelection,
            clearChartSelection,
            sampleRangeFrom,
            sampleRangeTo,
            traceSamples,
          }}
        />
      </HeightRetainer>
    </>
  );
}
