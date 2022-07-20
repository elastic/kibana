/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, FC } from 'react';
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
import { ProgressControls } from '@kbn/aiops-components';
import { useFetchStream } from '@kbn/aiops-utils';
import type { WindowParameters } from '@kbn/aiops-utils';
import { Filter, Query } from '@kbn/es-query';

import { useAiOpsKibana } from '../../kibana_context';
import { initialState, streamReducer } from '../../../common/api/stream_reducer';
import type { ApiExplainLogRateSpikes } from '../../../common/api';
import { SearchQueryLanguage } from '../../application/utils/search_utils';
import { useUrlState, usePageUrlState, AppStateKey } from '../../hooks/url_state';
import { useData } from '../../hooks/use_data';
import { SpikeAnalysisTable } from '../spike_analysis_table';
import { restorableDefaults } from './explain_log_rate_spikes_wrapper';
import { FullTimeRangeSelector } from '../full_time_range_selector';
import { DocumentCountContent } from '../document_count_content/document_count_content';
import { DatePickerWrapper } from '../date_picker_wrapper';
import { SearchPanel } from '../search_panel';

/**
 * ExplainLogRateSpikes props require a data view.
 */
interface ExplainLogRateSpikesProps {
  /** The data view to analyze. */
  dataView: DataView;
}

export const ExplainLogRateSpikes: FC<ExplainLogRateSpikesProps> = ({ dataView }) => {
  const { services } = useAiOpsKibana();
  const { http, data: dataService } = services;
  const basePath = http?.basePath.get() ?? '';

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

  const { docStats, timefilter, earliest, latest, searchQueryLanguage, searchString, searchQuery } =
    useData(dataView, aiopsListState, setGlobalState);

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

  const { cancel, start, data, isRunning, error } = useFetchStream<
    ApiExplainLogRateSpikes,
    typeof basePath
  >(
    `${basePath}/internal/aiops/explain_log_rate_spikes`,
    {
      // @ts-ignore unexpected type
      start: earliest,
      // @ts-ignore unexpected type
      end: latest,
      // TODO Consider an optional Kuery.
      kuery: '',
      // TODO Handle data view without time fields.
      timeFieldName: dataView.timeFieldName ?? '',
      index: dataView.title,
      ...windowParameters,
    },
    { reducer: streamReducer, initialState }
  );

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          {docStats?.totalCount !== undefined && (
            <EuiFlexItem>
              <DocumentCountContent
                brushSelectionUpdateHandler={setWindowParameters}
                documentCountStats={docStats.documentCountStats}
                totalCount={docStats.totalCount}
              />
            </EuiFlexItem>
          )}
          <EuiSpacer size="m" />
          {earliest !== undefined && latest !== undefined && windowParameters !== undefined && (
            <EuiFlexItem>
              <ProgressControls
                progress={data.loaded}
                progressMessage={data.loadingState ?? ''}
                isRunning={isRunning}
                onRefresh={start}
                onCancel={cancel}
              />
              {data?.changePoints ? (
                <SpikeAnalysisTable
                  changePointData={data.changePoints}
                  loading={isRunning}
                  error={error}
                />
              ) : null}
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPageContentBody>
    </>
  );
};
