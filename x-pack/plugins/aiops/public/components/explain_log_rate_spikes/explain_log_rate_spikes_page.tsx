/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState, FC } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import type { DataView } from '@kbn/data-views-plugin/public';
import type { WindowParameters } from '@kbn/aiops-utils';
import type { ChangePoint } from '@kbn/ml-agg-utils';
import { Filter, Query } from '@kbn/es-query';

import { useAiOpsKibana } from '../../kibana_context';
import { SearchQueryLanguage } from '../../application/utils/search_utils';
import { useUrlState, usePageUrlState, AppStateKey } from '../../hooks/url_state';
import { useData } from '../../hooks/use_data';
import { restorableDefaults } from './explain_log_rate_spikes_app_state';
import { FullTimeRangeSelector } from '../full_time_range_selector';
import { DocumentCountContent } from '../document_count_content/document_count_content';
import { DatePickerWrapper } from '../date_picker_wrapper';
import { SearchPanel } from '../search_panel';

import { ExplainLogRateSpikesAnalysis } from './explain_log_rate_spikes_analysis';

/**
 * ExplainLogRateSpikes props require a data view.
 */
interface ExplainLogRateSpikesPageProps {
  /** The data view to analyze. */
  dataView: DataView;
}

export const ExplainLogRateSpikesPage: FC<ExplainLogRateSpikesPageProps> = ({ dataView }) => {
  const { services } = useAiOpsKibana();
  const { data: dataService } = services;

  const [aiopsListState, setAiopsListState] = usePageUrlState(AppStateKey, restorableDefaults);
  const [globalState, setGlobalState] = useUrlState('_g');

  const setSearchParams = useCallback(
    (searchParams: {
      searchQuery: Query['query'];
      searchString: Query['query'];
      queryLanguage: SearchQueryLanguage;
      filters: Filter[];
    }) => {
      setAiopsListState({
        ...aiopsListState,
        searchQuery: searchParams.searchQuery,
        searchString: searchParams.searchString,
        searchQueryLanguage: searchParams.queryLanguage,
        filters: searchParams.filters,
      });
    },
    [aiopsListState, setAiopsListState]
  );

  const [pinnedChangePoint, setPinnedChangePoint] = useState<ChangePoint | null>(null);
  const [selectedChangePoint, setSelectedChangePoint] = useState<ChangePoint | null>(null);

  // If a row is pinned, still overrule with a potentially hovered row.
  const currentSelectedChangePoint = useMemo(() => {
    if (selectedChangePoint) {
      return selectedChangePoint;
    } else if (pinnedChangePoint) {
      return pinnedChangePoint;
    }
  }, [pinnedChangePoint, selectedChangePoint]);

  const {
    overallDocStats,
    selectedDocStats,
    timefilter,
    earliest,
    latest,
    searchQueryLanguage,
    searchString,
    searchQuery,
  } = useData(dataView, aiopsListState, setGlobalState);

  const totalCount = currentSelectedChangePoint
    ? overallDocStats.totalCount + selectedDocStats.totalCount
    : overallDocStats.totalCount;

  useEffect(() => {
    return () => {
      // When navigating away from the index pattern
      // Reset all previously set filters
      // to make sure new page doesn't have unrelated filters
      dataService.query.filterManager.removeAll();
    };
  }, [dataView.id, dataService.query.filterManager]);

  const [windowParameters, setWindowParameters] = useState<WindowParameters | undefined>();

  useEffect(() => {
    if (globalState?.time !== undefined) {
      timefilter.setTime({
        from: globalState.time.from,
        to: globalState.time.to,
      });
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
      query: searchString,
      language: searchQueryLanguage,
    });
  }, [dataService, searchQueryLanguage, searchString]);

  return (
    <>
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem>
          <EuiPageContentHeader className="aiopsPageHeader">
            <EuiPageContentHeaderSection>
              <div className="aiopsTitleHeader">
                <EuiTitle size={'s'}>
                  <h2>{dataView.title}</h2>
                </EuiTitle>
              </div>
            </EuiPageContentHeaderSection>

            <EuiFlexGroup
              alignItems="center"
              justifyContent="flexEnd"
              gutterSize="s"
              data-test-subj="aiopsTimeRangeSelectorSection"
            >
              {dataView.timeFieldName !== undefined && (
                <EuiFlexItem grow={false}>
                  <FullTimeRangeSelector
                    dataView={dataView}
                    query={undefined}
                    disabled={false}
                    timefilter={timefilter}
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <DatePickerWrapper />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageContentHeader>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule />
      <EuiPageContentBody>
        <EuiFlexGroup gutterSize="m" direction="column">
          <EuiFlexItem>
            <SearchPanel
              dataView={dataView}
              searchString={searchString}
              searchQuery={searchQuery}
              searchQueryLanguage={searchQueryLanguage}
              setSearchParams={setSearchParams}
            />
          </EuiFlexItem>
          {overallDocStats?.totalCount !== undefined && (
            <EuiFlexItem>
              <DocumentCountContent
                brushSelectionUpdateHandler={setWindowParameters}
                documentCountStats={overallDocStats.documentCountStats}
                documentCountStatsSplit={
                  currentSelectedChangePoint ? selectedDocStats.documentCountStats : undefined
                }
                totalCount={totalCount}
                changePoint={currentSelectedChangePoint}
              />
            </EuiFlexItem>
          )}
          <EuiSpacer size="m" />
          {earliest !== undefined && latest !== undefined && windowParameters !== undefined && (
            <EuiFlexItem>
              <ExplainLogRateSpikesAnalysis
                dataView={dataView}
                earliest={earliest}
                latest={latest}
                windowParameters={windowParameters}
                setPinnedChangePoint={setPinnedChangePoint}
                setSelectedChangePoint={setSelectedChangePoint}
                selectedChangePoint={currentSelectedChangePoint}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPageContentBody>
    </>
  );
};
