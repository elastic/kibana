/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useState } from 'react';
// import { parse, stringify } from 'query-string';
// import { isEqual } from 'lodash';
// import { encode } from 'rison-node';
// import { useHistory, useLocation } from 'react-router-dom';
import { Filter, Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPageBody,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import type { WindowParameters } from '@kbn/aiops-utils';
import type { DataView } from '@kbn/data-views-plugin/public';

// import {
//   Accessor,
//   Dictionary,
//   parseUrlState,
//   Provider as UrlStateContextProvider,
//   isRisonSerializationRequired,
//   getNestedProperty,
//   SetUrlState,
// } from '../../hooks/url_state';
import { useData } from '../../hooks/use_data';
import { useUrlState, usePageUrlState, AppStateKey } from '../../hooks/url_state';

import { FullTimeRangeSelector } from '../full_time_range_selector';
import { DocumentCountContent } from '../document_count_content/document_count_content';
import { DatePickerWrapper } from '../date_picker_wrapper';

import { ExplainLogRateSpikes } from './explain_log_rate_spikes';
import { SearchPanel } from '../search_panel';
import { SEARCH_QUERY_LANGUAGE, SearchQueryLanguage } from '../../../common/types';
import { useAiOpsKibana } from '../../kibana_context';

export interface ExplainLogRateSpikesWrapperProps {
  /** The data view to analyze. */
  dataView: DataView;
}

const defaultSearchQuery = {
  match_all: {},
};

export interface AiOpsIndexBasedAppState {
  searchString?: Query['query'];
  searchQuery?: Query['query'];
  searchQueryLanguage?: SearchQueryLanguage;
  filters?: Filter[];
}

export const getDefaultAiOpsListState = (
  overrides?: Partial<AiOpsIndexBasedAppState>
): Required<AiOpsIndexBasedAppState> => ({
  searchString: '',
  searchQuery: defaultSearchQuery,
  searchQueryLanguage: SEARCH_QUERY_LANGUAGE.KUERY,
  filters: [],
  ...overrides,
});

const restorableDefaults = getDefaultAiOpsListState();

export const ExplainLogRateSpikesWrapper: FC<ExplainLogRateSpikesWrapperProps> = ({ dataView }) => {
  const { services } = useAiOpsKibana();
  const { notifications, data } = services;
  const { toasts } = notifications;

  const [aiopsListState, setAiopsListState] = usePageUrlState(AppStateKey, restorableDefaults);

  const [globalState, setGlobalState] = useUrlState('_g');

  //  const [currentSavedSearch, setCurrentSavedSearch] = useState(
  //   dataVisualizerProps.currentSavedSearch
  // );

  //  useEffect(() => {
  //   if (dataVisualizerProps?.currentSavedSearch !== undefined) {
  //     setCurrentSavedSearch(dataVisualizerProps?.currentSavedSearch);
  //   }
  // }, [dataVisualizerProps?.currentSavedSearch]);

  useEffect(() => {
    if (!dataView.isTimeBased()) {
      toasts.addWarning({
        title: i18n.translate('xpack.aiops.index.dataViewNotBasedOnTimeSeriesNotificationTitle', {
          defaultMessage: 'The data view {dataViewTitle} is not based on a time series',
          values: { dataViewTitle: dataView.title },
        }),
        text: i18n.translate(
          'xpack.aiops.index.dataViewNotBasedOnTimeSeriesNotificationDescription',
          {
            defaultMessage: 'Anomaly detection only runs over time-based indices',
          }
        ),
      });
    }
  }, [dataView, toasts]);

  const setSearchParams = useCallback(
    (searchParams: {
      searchQuery: Query['query'];
      searchString: Query['query'];
      queryLanguage: SearchQueryLanguage;
      filters: Filter[];
    }) => {
      // When the user loads saved search and then clear or modify the query
      // we should remove the saved search and replace it with the index pattern id
      // if (currentSavedSearch !== null) {
      //   setCurrentSavedSearch(null);
      // }

      setAiopsListState({
        ...aiopsListState,
        searchQuery: searchParams.searchQuery,
        searchString: searchParams.searchString,
        searchQueryLanguage: searchParams.queryLanguage,
        filters: searchParams.filters,
      });
    },
    [aiopsListState, setAiopsListState] // currentSavedSearch
  );

  const { docStats, timefilter, searchQueryLanguage, searchString, searchQuery } = useData(
    dataView,
    aiopsListState,
    setGlobalState
  );

  useEffect(() => {
    return () => {
      // When navigating away from the index pattern
      // Reset all previously set filters
      // to make sure new page doesn't have unrelated filters
      data.query.filterManager.removeAll();
    };
  }, [dataView.id, data.query.filterManager]);

  const [windowParameters, setWindowParameters] = useState<WindowParameters | undefined>();

  const activeBounds = timefilter.getActiveBounds();
  let earliest: number | undefined;
  let latest: number | undefined;
  if (activeBounds !== undefined) {
    earliest = activeBounds.min?.valueOf();
    latest = activeBounds.max?.valueOf();
  }

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

  // const history = useHistory();
  // const { search: urlSearchString } = useLocation();

  // const setUrlState: SetUrlState = useCallback(
  //   (
  //     accessor: Accessor,
  //     attribute: string | Dictionary<any>,
  //     value?: any,
  //     replaceState?: boolean
  //   ) => {
  //     const prevSearchString = urlSearchString;
  //     const urlState = parseUrlState(prevSearchString);
  //     const parsedQueryString = parse(prevSearchString, { sort: false });

  //     if (!Object.prototype.hasOwnProperty.call(urlState, accessor)) {
  //       urlState[accessor] = {};
  //     }

  //     if (typeof attribute === 'string') {
  //       if (isEqual(getNestedProperty(urlState, `${accessor}.${attribute}`), value)) {
  //         return prevSearchString;
  //       }

  //       urlState[accessor][attribute] = value;
  //     } else {
  //       const attributes = attribute;
  //       Object.keys(attributes).forEach((a) => {
  //         urlState[accessor][a] = attributes[a];
  //       });
  //     }

  //     try {
  //       const oldLocationSearchString = stringify(parsedQueryString, {
  //         sort: false,
  //         encode: false,
  //       });

  //       Object.keys(urlState).forEach((a) => {
  //         if (isRisonSerializationRequired(a)) {
  //           parsedQueryString[a] = encode(urlState[a]);
  //         } else {
  //           parsedQueryString[a] = urlState[a];
  //         }
  //       });
  //       const newLocationSearchString = stringify(parsedQueryString, {
  //         sort: false,
  //         encode: false,
  //       });

  //       if (oldLocationSearchString !== newLocationSearchString) {
  //         const newSearchString = stringify(parsedQueryString, { sort: false });
  //         if (replaceState) {
  //           history.replace({ search: newSearchString });
  //         } else {
  //           history.push({ search: newSearchString });
  //         }
  //       }
  //     } catch (error) {
  //       // eslint-disable-next-line no-console
  //       console.error('Could not save url state', error);
  //     }
  //   },
  //   [history, urlSearchString]
  // );

  useEffect(() => {
    // Update data query manager if input string is updated
    data?.query.queryString.setQuery({
      query: searchString,
      language: searchQueryLanguage,
    });
  }, [data, searchQueryLanguage, searchString]);

  if (!dataView || !timefilter) return null;

  return (
    // <UrlStateContextProvider value={{ searchString: urlSearchString, setUrlState }}>
      <EuiPageBody data-test-subj="aiopsIndexPage" paddingSize="none" panelled={false}>
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
            {docStats?.totalCount !== undefined && (
              <EuiFlexItem>
                <DocumentCountContent
                  brushSelectionUpdateHandler={setWindowParameters}
                  documentCountStats={docStats.documentCountStats}
                  totalCount={docStats.totalCount}
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <SearchPanel
                dataView={dataView}
                searchString={searchString}
                searchQuery={searchQuery}
                searchQueryLanguage={searchQueryLanguage}
                setSearchParams={setSearchParams}
              />
            </EuiFlexItem>
            <EuiSpacer size="m" />
            {earliest !== undefined && latest !== undefined && windowParameters !== undefined && (
              <EuiFlexItem>
                <ExplainLogRateSpikes
                  dataView={dataView}
                  earliest={earliest}
                  latest={latest}
                  windowParameters={windowParameters}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPageContentBody>
      </EuiPageBody>
    // </UrlStateContextProvider>
  );
};
