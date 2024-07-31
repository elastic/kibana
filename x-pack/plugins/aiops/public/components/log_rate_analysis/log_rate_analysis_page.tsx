/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { isEqual, orderBy } from 'lodash';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { EuiFlexGroup, EuiFlexItem, EuiPageBody, EuiPageSection, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { Message } from '@kbn/observability-ai-assistant-plugin/public';
import type { Filter, Query } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import { useUrlState, usePageUrlState } from '@kbn/ml-url-state';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import type { WindowParameters } from '@kbn/aiops-log-rate-analysis';
import { AIOPS_TELEMETRY_ID } from '@kbn/aiops-common/constants';
import {
  useAppDispatch,
  useCurrentSelectedSignificantItem,
  useCurrentSelectedGroup,
  setInitialAnalysisStart,
  setDocumentCountChartData,
} from '@kbn/aiops-log-rate-analysis/state';
import {
  LOG_RATE_ANALYSIS_TYPE,
  type LogRateAnalysisType,
} from '@kbn/aiops-log-rate-analysis/log_rate_analysis_type';

import { useDataSource } from '../../hooks/use_data_source';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { useData } from '../../hooks/use_data';
import { useSearch } from '../../hooks/use_search';
import {
  getDefaultLogRateAnalysisAppState,
  appStateToWindowParameters,
  windowParametersToAppState,
  type LogRateAnalysisPageUrlState,
} from '../../application/url_state/log_rate_analysis';

import { SearchPanel } from '../search_panel';
import { PageHeader } from '../page_header';

import type { LogRateAnalysisResultsData } from './log_rate_analysis_results';

import { LogRateAnalysisContent } from './log_rate_analysis_content/log_rate_analysis_content';

interface SignificantFieldValue {
  field: string;
  value: string | number;
  docCount: number;
  pValue: number | null;
}

interface LogRateAnalysisPageProps {
  showContextualInsights?: boolean;
}

export const LogRateAnalysisPage: FC<LogRateAnalysisPageProps> = ({
  showContextualInsights = false,
}) => {
  const aiopsAppContext = useAiopsAppContext();
  const { data: dataService, observabilityAIAssistant } = aiopsAppContext;
  const { dataView, savedSearch } = useDataSource();

  const currentSelectedGroup = useCurrentSelectedGroup();
  const currentSelectedSignificantItem = useCurrentSelectedSignificantItem();
  const dispatch = useAppDispatch();

  const [stateFromUrl, setUrlState] = usePageUrlState<LogRateAnalysisPageUrlState>(
    'logRateAnalysis',
    getDefaultLogRateAnalysisAppState()
  );
  const [globalState, setGlobalState] = useUrlState('_g');

  const [selectedSavedSearch, setSelectedSavedSearch] = useState(savedSearch);

  // Used to store analysis results to be passed on to the AI Assistant.
  const [logRateAnalysisParams, setLogRateAnalysisParams] = useState<
    | {
        logRateAnalysisType: LogRateAnalysisType;
        significantFieldValues: SignificantFieldValue[];
      }
    | undefined
  >();

  useEffect(() => {
    if (savedSearch) {
      setSelectedSavedSearch(savedSearch);
    }
  }, [savedSearch]);

  const setSearchParams = useCallback(
    (searchParams: {
      searchQuery: estypes.QueryDslQueryContainer;
      searchString: Query['query'];
      queryLanguage: SearchQueryLanguage;
      filters: Filter[];
    }) => {
      // When the user loads a saved search and then clears or modifies the query
      // we should remove the saved search and replace it with the index pattern id
      if (selectedSavedSearch !== null) {
        setSelectedSavedSearch(null);
      }

      setUrlState({
        ...stateFromUrl,
        searchQuery: searchParams.searchQuery,
        searchString: searchParams.searchString,
        searchQueryLanguage: searchParams.queryLanguage,
        filters: searchParams.filters,
      });
    },
    [selectedSavedSearch, stateFromUrl, setUrlState]
  );

  const { searchQueryLanguage, searchString, searchQuery } = useSearch(
    { dataView, savedSearch },
    stateFromUrl
  );

  const { documentStats, timefilter, earliest, latest, intervalMs } = useData(
    dataView,
    'log_rate_analysis',
    searchQuery,
    setGlobalState,
    currentSelectedSignificantItem,
    currentSelectedGroup
  );

  // TODO Since `useData` isn't just used within Log Rate Analysis, this is a bit of
  // a workaround to pass the result on to the redux store. At least this ensures
  // we now use `useData` only once across Log Rate Analysis! Originally `useData`
  // was quite general, but over time it got quite some specific features used
  // across Log Rate Analysis and Pattern Analysis. We discussed that we should
  // split this up into more specific hooks.
  useEffect(() => {
    dispatch(
      setDocumentCountChartData({
        earliest,
        latest,
        intervalMs,
        documentStats,
      })
    );
  }, [documentStats, dispatch, earliest, intervalMs, latest]);

  useEffect(
    // TODO: Consolidate this hook/function with the one in `x-pack/plugins/data_visualizer/public/application/index_data_visualizer/components/index_data_visualizer_view/index_data_visualizer_view.tsx`
    function clearFiltersOnLeave() {
      return () => {
        // We want to clear all filters that have not been pinned globally
        // when navigating to other pages
        dataService.query.filterManager
          .getFilters()
          .filter((f) => f.$state?.store === FilterStateStore.APP_STATE)
          .forEach((f) => dataService.query.filterManager.removeFilter(f));
      };
    },
    [dataService.query.filterManager]
  );

  useEffect(() => {
    if (globalState?.time !== undefined) {
      if (
        !isEqual({ from: globalState.time.from, to: globalState.time.to }, timefilter.getTime())
      ) {
        timefilter.setTime({
          from: globalState.time.from,
          to: globalState.time.to,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(globalState?.time), timefilter]);

  useEffect(() => {
    if (globalState?.refreshInterval !== undefined) {
      timefilter.setRefreshInterval(globalState.refreshInterval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(globalState?.refreshInterval), timefilter]);

  useEffect(() => {
    // Update data query manager if input string is updated
    dataService?.query.queryString.setQuery({
      query: searchString ?? '',
      language: searchQueryLanguage,
    });
  }, [dataService, searchQueryLanguage, searchString]);

  useEffect(
    () => {
      dispatch(setInitialAnalysisStart(appStateToWindowParameters(stateFromUrl.wp)));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onWindowParametersHandler = (wp?: WindowParameters, replace = false) => {
    if (!isEqual(windowParametersToAppState(wp), stateFromUrl.wp)) {
      setUrlState(
        {
          wp: windowParametersToAppState(wp),
        },
        replace
      );
    }
  };

  const onAnalysisCompleted = (analysisResults: LogRateAnalysisResultsData | undefined) => {
    const significantFieldValues = orderBy(
      analysisResults?.significantItems?.map((item) => ({
        field: item.fieldName,
        value: item.fieldValue,
        docCount: item.doc_count,
        pValue: item.pValue,
      })),
      ['pValue', 'docCount'],
      ['asc', 'asc']
    ).slice(0, 50);

    const logRateAnalysisType = analysisResults?.analysisType;
    setLogRateAnalysisParams(
      significantFieldValues && logRateAnalysisType
        ? { logRateAnalysisType, significantFieldValues }
        : undefined
    );
  };

  const messages = useMemo<Message[] | undefined>(() => {
    const hasLogRateAnalysisParams =
      logRateAnalysisParams && logRateAnalysisParams.significantFieldValues?.length > 0;

    if (!hasLogRateAnalysisParams || !observabilityAIAssistant) {
      return undefined;
    }

    const { logRateAnalysisType } = logRateAnalysisParams;

    const header = 'Field name,Field value,Doc count,p-value';
    const rows = logRateAnalysisParams.significantFieldValues
      .map((item) => Object.values(item).join(','))
      .join('\n');

    return observabilityAIAssistant.getContextualInsightMessages({
      message:
        'Can you identify possible causes and remediations for these log rate analysis results',
      instructions: `You are an AIOps expert using Elastic's Kibana on call being consulted about a log rate change that got triggered by a ${logRateAnalysisType} in log messages. Your job is to take immediate action and proceed with both urgency and precision.
      "Log Rate Analysis" is an AIOps feature that uses advanced statistical methods to identify reasons for increases and decreases in log rates. It makes it easy to find and investigate causes of unusual spikes or dips by using the analysis workflow view.
      You are using "Log Rate Analysis" and ran the statistical analysis on the log messages which occured during the alert.
      You received the following analysis results from "Log Rate Analysis" which list statistically significant co-occuring field/value combinations sorted from most significant (lower p-values) to least significant (higher p-values) that ${
        logRateAnalysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE
          ? 'contribute to the log rate spike'
          : 'are less or not present in the log rate dip'
      }:

      ${
        logRateAnalysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE
          ? 'The median log rate in the selected deviation time range is higher than the baseline. Therefore, the results shows statistically significant items within the deviation time range that are contributors to the spike. The "doc count" column refers to the amount of documents in the deviation time range.'
          : 'The median log rate in the selected deviation time range is lower than the baseline. Therefore, the analysis results table shows statistically significant items within the baseline time range that are less in number or missing within the deviation time range. The "doc count" column refers to the amount of documents in the baseline time range.'
      }

      ${header}
      ${rows}

      Based on the above analysis results and your observability expert knowledge, output the following:
      Analyse the type of these logs and explain their usual purpose (1 paragraph).
      ${
        logRateAnalysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE
          ? 'Based on the type of these logs do a root cause analysis on why the field and value combinations from the analysis results are causing this log rate spike (2 parapraphs)'
          : 'Based on the type of these logs explain why the statistically significant field and value combinations are less in number or missing from the log rate dip with concrete examples based on the analysis results data which contains items that are present in the baseline time range and are missing or less in number in the deviation time range (2 paragraphs)'
      }.
      ${
        logRateAnalysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE
          ? 'Recommend concrete remediations to resolve the root cause (3 bullet points).'
          : ''
      }

      Do not mention individual p-values from the analysis results.
      Do not repeat the full list of field names and field values back to the user.
      Do not repeat the given instructions in your output.`,
    });
  }, [logRateAnalysisParams, observabilityAIAssistant]);

  const logRateAnalysisTitle = i18n.translate(
    'xpack.aiops.observabilityAIAssistantContextualInsight.logRateAnalysisTitle',
    {
      defaultMessage: 'Possible causes and remediations',
    }
  );

  return (
    <EuiPageBody data-test-subj="aiopsLogRateAnalysisPage" paddingSize="none" panelled={false}>
      <PageHeader />
      <EuiSpacer size="m" />
      <EuiPageSection paddingSize="none">
        <EuiFlexGroup gutterSize="m" direction="column">
          <EuiFlexItem>
            <SearchPanel
              searchString={searchString ?? ''}
              searchQuery={searchQuery}
              searchQueryLanguage={searchQueryLanguage}
              setSearchParams={setSearchParams}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <LogRateAnalysisContent
              embeddingOrigin={AIOPS_TELEMETRY_ID.AIOPS_DEFAULT_SOURCE}
              esSearchQuery={searchQuery}
              onWindowParametersChange={onWindowParametersHandler}
              onAnalysisCompleted={onAnalysisCompleted}
            />
          </EuiFlexItem>
          {showContextualInsights &&
          observabilityAIAssistant?.ObservabilityAIAssistantContextualInsight &&
          messages ? (
            <EuiFlexItem grow={false}>
              <observabilityAIAssistant.ObservabilityAIAssistantContextualInsight
                title={logRateAnalysisTitle}
                messages={messages}
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiPageSection>
    </EuiPageBody>
  );
};
