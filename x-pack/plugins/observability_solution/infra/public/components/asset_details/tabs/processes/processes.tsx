/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import { debounce } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiSearchBar,
  EuiEmptyPrompt,
  EuiButton,
  EuiTitle,
  Query,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { getFieldByType } from '@kbn/metrics-data-access-plugin/common';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { useSourceContext } from '../../../../containers/metrics_source';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { parseSearchString } from './parse_search_string';
import { ProcessesTable } from './processes_table';
import { STATE_NAMES } from './states';
import { SummaryTable } from './summary_table';
import { ProcessListContextProvider, type SortBy } from '../../hooks/use_process_list';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { ProcessesExplanationMessage } from '../../components/processes_explanation';
import { useAssetDetailsUrlState } from '../../hooks/use_asset_details_url_state';
import { TopProcessesTooltip } from '../../components/top_processes_tooltip';
import { ProcessListAPIResponseRT } from '../../../../../common/http_api';
import { useRequestObservable } from '../../hooks/use_request_observable';
import { useTabSwitcherContext } from '../../hooks/use_tab_switcher';

const options = Object.entries(STATE_NAMES).map(([value, view]: [string, string]) => ({
  value,
  view,
}));

export const Processes = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { getDateRangeInTimestamp } = useDatePickerContext();
  const [urlState, setUrlState] = useAssetDetailsUrlState();
  const { asset } = useAssetDetailsRenderPropsContext();
  const { sourceId } = useSourceContext();
  const { request$ } = useRequestObservable();
  const { isActiveTab } = useTabSwitcherContext();

  const [searchText, setSearchText] = useState(urlState?.processSearch ?? '');
  const [searchQueryError, setSearchQueryError] = useState<Error | null>(null);
  const [searchBarState, setSearchBarState] = useState<Query>(() =>
    searchText ? Query.parse(searchText) : Query.MATCH_ALL
  );

  const toTimestamp = useMemo(() => getDateRangeInTimestamp().to, [getDateRangeInTimestamp]);

  const [sortBy, setSortBy] = useState<SortBy>({
    name: 'cpu',
    isAscending: false,
  });

  const hostTerm = useMemo(() => {
    const field = getFieldByType(asset.type) ?? asset.type;
    return { [field]: asset.name };
  }, [asset.name, asset.type]);

  const searchFilter = useMemo(() => parseSearchString(searchText), [searchText]);
  const parsedSortBy = useMemo(
    () =>
      sortBy.name === 'runtimeLength'
        ? {
            ...sortBy,
            name: 'startTime',
          }
        : sortBy,
    [sortBy]
  );

  const { data, status, error, refetch } = useFetcher(
    async (callApi) => {
      const response = await callApi('/api/metrics/process_list', {
        method: 'POST',
        body: JSON.stringify({
          hostTerm,
          sourceId,
          to: toTimestamp,
          sortBy: parsedSortBy,
          searchFilter,
        }),
      });

      return decodeOrThrow(ProcessListAPIResponseRT)(response);
    },
    [hostTerm, parsedSortBy, searchFilter, sourceId, toTimestamp],
    {
      requestObservable$: request$,
      autoFetch: isActiveTab('processes'),
    }
  );

  const debouncedSearchOnChange = useMemo(() => {
    return debounce<(queryText: string) => void>((queryText) => {
      setSearchText(queryText);
    }, 500);
  }, []);

  const searchBarOnChange = useCallback(
    ({ query, queryText, error: queryError }: any) => {
      if (queryError) {
        setSearchQueryError(queryError);
      } else {
        setUrlState({ processSearch: queryText });
        setSearchQueryError(null);
        setSearchBarState(query);
        debouncedSearchOnChange(queryText);
      }
    },
    [debouncedSearchOnChange, setUrlState]
  );

  const clearSearchBar = useCallback(() => {
    setSearchBarState(Query.MATCH_ALL);
    setUrlState({ processSearch: '' });
    setSearchQueryError(null);
    setSearchText('');
  }, [setUrlState]);

  const isLoading = isPending(status);

  return (
    <ProcessListContextProvider hostTerm={hostTerm} to={toTimestamp}>
      <EuiFlexGroup direction="column" gutterSize="m" ref={ref}>
        <EuiFlexItem grow={false}>
          <SummaryTable
            isLoading={isLoading}
            processSummary={error || !data?.summary ? { total: 0 } : data?.summary}
          />
        </EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle data-test-subj="infraAssetDetailsTopProcessesTitle" size="xxs">
                <span>
                  <FormattedMessage
                    id="xpack.infra.metrics.nodeDetails.processesHeader"
                    defaultMessage="Top processes"
                  />
                </span>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <TopProcessesTooltip />
            </EuiFlexItem>
          </EuiFlexGroup>
          {!error && (
            <EuiFlexGroup alignItems="flexStart">
              <EuiFlexItem>
                {isLoading ? (
                  <EuiLoadingSpinner />
                ) : (
                  (data?.processList ?? []).length > 0 && <ProcessesExplanationMessage />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiSearchBar
            query={searchBarState}
            onChange={searchBarOnChange}
            box={{
              'data-test-subj': 'infraAssetDetailsProcessesSearchBarInput',
              incremental: true,
              placeholder: i18n.translate('xpack.infra.metrics.nodeDetails.searchForProcesses', {
                defaultMessage: 'Search for processes…',
              }),
            }}
            filters={[
              {
                type: 'field_value_selection',
                field: 'state',
                name: 'State',
                operator: 'exact',
                multiSelect: false,
                options,
              },
            ]}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {!error ? (
            <ProcessesTable
              currentTime={toTimestamp}
              isLoading={isLoading}
              processList={data?.processList ?? []}
              sortBy={sortBy}
              error={searchQueryError?.message}
              setSortBy={setSortBy}
              clearSearchBar={clearSearchBar}
            />
          ) : (
            <EuiEmptyPrompt
              iconType="warning"
              title={
                <h4>
                  <FormattedMessage
                    id="xpack.infra.metrics.nodeDetails.processListError"
                    defaultMessage="Unable to load process data"
                  />
                </h4>
              }
              actions={
                <EuiButton
                  data-test-subj="infraAssetDetailsTabComponentTryAgainButton"
                  color="primary"
                  fill
                  onClick={refetch}
                >
                  <FormattedMessage
                    id="xpack.infra.metrics.nodeDetails.processListRetry"
                    defaultMessage="Try again"
                  />
                </EuiButton>
              }
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </ProcessListContextProvider>
  );
};
