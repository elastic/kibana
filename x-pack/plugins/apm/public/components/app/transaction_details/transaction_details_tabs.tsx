/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useHistory } from 'react-router-dom';

import { XYBrushArea } from '@elastic/charts';
import { EuiPanel, EuiSpacer, EuiTabs, EuiTab } from '@elastic/eui';

import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useTransactionTraceSamplesFetcher } from '../../../hooks/use_transaction_trace_samples_fetcher';

import { HeightRetainer } from '../../shared/HeightRetainer';
import { fromQuery, toQuery } from '../../shared/Links/url_helpers';

import { failedTransactionsTab } from './failed_transactions_tab';
import { latencyCorrelationsTab } from './latency_correlations_tab';
import { traceSamplesTab } from './trace_samples_tab';

const tabs = [traceSamplesTab, latencyCorrelationsTab, failedTransactionsTab];

export function TransactionDetailsTabs() {
  const { query } = useApmParams('/services/:serviceName/transactions/view');

  const { urlParams } = useUrlParams();
  const history = useHistory();

  const [currentTab, setCurrentTab] = useState(traceSamplesTab.key);
  const { component: TabContent } =
    tabs.find((tab) => tab.key === currentTab) ?? traceSamplesTab;

  const { transactionName } = query;
  const { traceSamplesData } = useTransactionTraceSamplesFetcher({
    transactionName,
  });

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

  const { sampleRangeFrom, sampleRangeTo } = urlParams;
  const { traceSamples } = traceSamplesData;

  const clearChartSelection = () => {
    const currentQuery = toQuery(history.location.search);
    delete currentQuery.sampleRangeFrom;
    delete currentQuery.sampleRangeTo;

    const firstSample = traceSamples[0];
    currentQuery.transactionId = firstSample?.transactionId;
    currentQuery.traceId = firstSample?.traceId;

    history.push({
      ...history.location,
      search: fromQuery(currentQuery),
    });
  };

  return (
    <>
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
        <EuiPanel hasBorder={true}>
          <TabContent
            {...{
              selectSampleFromChartSelection,
              clearChartSelection,
              sampleRangeFrom,
              sampleRangeTo,
              traceSamples,
            }}
          />
        </EuiPanel>
      </HeightRetainer>
    </>
  );
}
