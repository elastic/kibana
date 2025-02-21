/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { XYBrushEvent } from '@elastic/charts';
import { EuiPanel, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { omit } from 'lodash';
import { useHistory } from 'react-router-dom';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { maybe } from '../../../../common/utils/maybe';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useCriticalPathFeatureEnabledSetting } from '../../../hooks/use_critical_path_feature_enabled_setting';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useSampleChartSelection } from '../../../hooks/use_sample_chart_selection';
import type { TraceSamplesFetchResult } from '../../../hooks/use_transaction_trace_samples_fetcher';
import { useTransactionTraceSamplesFetcher } from '../../../hooks/use_transaction_trace_samples_fetcher';
import { fromQuery, toQuery } from '../../shared/links/url_helpers';
import { aggregatedCriticalPathTab } from './aggregated_critical_path_tab';
import { failedTransactionsCorrelationsTab } from './failed_transactions_correlations_tab';
import { latencyCorrelationsTab } from './latency_correlations_tab';
import { profilingTab } from './profiling_tab';
import { traceSamplesTab } from './trace_samples_tab';
import { useTransactionProfilingSetting } from '../../../hooks/use_profiling_integration_setting';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { isJavaAgentName } from '../../../../common/agent_name';

export interface TabContentProps {
  clearChartSelection: () => void;
  onFilter: () => void;
  sampleRangeFrom?: number;
  sampleRangeTo?: number;
  selectSampleFromChartSelection: (selection: XYBrushEvent) => void;
  traceSamplesFetchResult: TraceSamplesFetchResult;
}

export function TransactionDetailsTabs() {
  const { query } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view'
  );
  const { agentName } = useApmServiceContext();

  const isCriticalPathFeatureEnabled = useCriticalPathFeatureEnabledSetting();
  const isTransactionProfilingEnabled = useTransactionProfilingSetting();
  const { onPageReady } = usePerformanceContext();

  const availableTabs = useMemo(() => {
    const tabs = [traceSamplesTab, latencyCorrelationsTab, failedTransactionsCorrelationsTab];
    if (isCriticalPathFeatureEnabled) {
      tabs.push(aggregatedCriticalPathTab);
    }

    if (isTransactionProfilingEnabled && isJavaAgentName(agentName)) {
      tabs.push(profilingTab);
    }

    return tabs;
  }, [agentName, isCriticalPathFeatureEnabled, isTransactionProfilingEnabled]);

  const { urlParams } = useLegacyUrlParams();
  const history = useHistory();

  const [currentTab, setCurrentTab] = useState(traceSamplesTab.key);
  const { component: TabContent } =
    availableTabs.find((tab) => tab.key === currentTab) ?? traceSamplesTab;

  const { environment, kuery, transactionName, rangeFrom, rangeTo } = query;

  const traceSamplesFetchResult = useTransactionTraceSamplesFetcher({
    transactionName,
    kuery,
    environment,
  });

  const { sampleRangeFrom, sampleRangeTo, transactionId, traceId } = urlParams;

  const { clearChartSelection, selectSampleFromChartSelection } = useSampleChartSelection();

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
    if (traceSamplesFetchResult.status === FETCH_STATUS.SUCCESS) {
      onPageReady({
        meta: {
          rangeFrom,
          rangeTo,
        },
        customMetrics: {
          key1: 'traceDocsTotal',
          value1: traceSamplesFetchResult.data?.traceSamples?.length ?? 0,
        },
      });
    }
  }, [traceSamplesFetchResult, onPageReady, rangeFrom, rangeTo]);

  useEffect(() => {
    const selectedSample = traceSamplesFetchResult.data?.traceSamples.find(
      (sample) => sample.transactionId === transactionId && sample.traceId === traceId
    );

    if (traceSamplesFetchResult.status === FETCH_STATUS.SUCCESS && !selectedSample) {
      // selected sample was not found. select a new one:
      const preferredSample = maybe(traceSamplesFetchResult.data?.traceSamples[0]);

      history.replace({
        ...history.location,
        search: fromQuery({
          ...omit(toQuery(history.location.search), ['traceId', 'transactionId']),
          ...preferredSample,
        }),
      });
    }
  }, [history, transactionId, traceId, traceSamplesFetchResult]);

  return (
    <>
      <EuiTabs>
        {availableTabs.map(({ dataTestSubj, key, label }) => (
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
            traceSamplesFetchResult,
          }}
        />
      </EuiPanel>
    </>
  );
}
