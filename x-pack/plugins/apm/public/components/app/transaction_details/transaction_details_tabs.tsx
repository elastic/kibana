/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';

import { omit } from 'lodash';
import { useHistory } from 'react-router-dom';

import { XYBrushEvent } from '@elastic/charts';
import { EuiPanel, EuiSpacer, EuiTabs, EuiTab } from '@elastic/eui';

import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useTransactionTraceSamplesFetcher } from '../../../hooks/use_transaction_trace_samples_fetcher';

import { maybe } from '../../../../common/utils/maybe';
import { fromQuery, push, toQuery } from '../../shared/links/url_helpers';

import { failedTransactionsCorrelationsTab } from './failed_transactions_correlations_tab';
import { latencyCorrelationsTab } from './latency_correlations_tab';
import { traceSamplesTab } from './trace_samples_tab';

const tabs = [
  traceSamplesTab,
  latencyCorrelationsTab,
  failedTransactionsCorrelationsTab,
];

export function TransactionDetailsTabs() {
  const { query } = useApmParams('/services/{serviceName}/transactions/view');

  const { urlParams } = useLegacyUrlParams();
  const history = useHistory();

  const [currentTab, setCurrentTab] = useState(traceSamplesTab.key);
  const { component: TabContent } =
    tabs.find((tab) => tab.key === currentTab) ?? traceSamplesTab;

  const { environment, kuery, transactionName } = query;
  const { traceSamplesData } = useTransactionTraceSamplesFetcher({
    transactionName,
    kuery,
    environment,
  });

  const selectSampleFromChartSelection = (selection: XYBrushEvent) => {
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

  const { sampleRangeFrom, sampleRangeTo, transactionId, traceId } = urlParams;
  const { traceSamples } = traceSamplesData;

  const clearChartSelection = () => {
    // enforces a reset of the current sample to be highlighted in the chart
    // and selected in waterfall section below, otherwise we end up with
    // stale data for the selected sample
    push(history, {
      query: {
        sampleRangeFrom: '',
        sampleRangeTo: '',
        traceId: '',
        transactionId: '',
      },
    });
  };

  // When filtering in either the latency correlations or failed transactions correlations tab,
  // scroll to the top of the page and switch to the 'Trace samples' tab to trigger a refresh.
  const traceSamplesTabKey = traceSamplesTab.key;
  const onFilter = useCallback(() => {
    // Scroll to the top of the page
    window.scrollTo(0, 0);
    // Switch back to the 'trace samples' tab
    setCurrentTab(traceSamplesTabKey);
  }, [traceSamplesTabKey]);

  useEffect(() => {
    const selectedSample = traceSamples.find(
      (sample) =>
        sample.transactionId === transactionId && sample.traceId === traceId
    );

    if (!selectedSample) {
      // selected sample was not found. select a new one:
      const preferredSample = maybe(traceSamples[0]);

      history.replace({
        ...history.location,
        search: fromQuery({
          ...omit(toQuery(history.location.search), [
            'traceId',
            'transactionId',
          ]),
          ...preferredSample,
        }),
      });
    }
  }, [history, traceSamples, transactionId, traceId]);

  return (
    <>
      <EuiTabs>
        {tabs.map(({ dataTestSubj, key, label }) => (
          <EuiTab
            data-test-subj={dataTestSubj}
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
      <EuiPanel hasBorder={true}>
        <TabContent
          {...{
            clearChartSelection,
            onFilter,
            sampleRangeFrom,
            sampleRangeTo,
            selectSampleFromChartSelection,
            traceSamples,
          }}
        />
      </EuiPanel>
    </>
  );
}
