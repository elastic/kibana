/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { debounce } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiSearchBar,
  EuiEmptyPrompt,
  EuiButton,
  EuiIconTip,
  EuiTitle,
  Query,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { parseSearchString } from './parse_search_string';
import { ProcessesTable } from './processes_table';
import { STATE_NAMES } from './states';
import { SummaryTable } from './summary_table';
import {
  SortBy,
  useProcessList,
  ProcessListContextProvider,
} from '../../../../pages/metrics/inventory_view/hooks/use_process_list';
import { getFieldByType } from '../../../../../common/inventory_models';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDateRangeProviderContext } from '../../hooks/use_date_range';
import { ProcessesExplanationMessage } from '../../components/processes_explanation';
import { useAssetDetailsUrlState } from '../../hooks/use_asset_details_url_state';

const options = Object.entries(STATE_NAMES).map(([value, view]: [string, string]) => ({
  value,
  view,
}));

export const Processes = () => {
  const { getDateRangeInTimestamp } = useDateRangeProviderContext();
  const [urlState, setUrlState] = useAssetDetailsUrlState();
  const { asset, assetType } = useAssetDetailsRenderPropsContext();

  const [searchText, setSearchText] = useState(urlState?.processSearch ?? '');
  const [searchBarState, setSearchBarState] = useState<Query>(() =>
    searchText ? Query.parse(searchText) : Query.MATCH_ALL
  );

  const currentTimestamp = getDateRangeInTimestamp().to;

  const [sortBy, setSortBy] = useState<SortBy>({
    name: 'cpu',
    isAscending: false,
  });

  const hostTerm = useMemo(() => {
    const field = getFieldByType(assetType) ?? assetType;
    return { [field]: asset.name };
  }, [asset.name, assetType]);

  const {
    loading,
    error,
    response,
    makeRequest: reload,
  } = useProcessList(hostTerm, currentTimestamp, sortBy, parseSearchString(searchText));

  const debouncedSearchOnChange = useMemo(() => {
    return debounce<(queryText: string) => void>((queryText) => {
      setUrlState({ processSearch: queryText });
      setSearchText(queryText);
    }, 500);
  }, [setUrlState]);

  const searchBarOnChange = useCallback(
    ({ query, queryText }) => {
      setSearchBarState(query);
      debouncedSearchOnChange(queryText);
    },
    [debouncedSearchOnChange]
  );

  const clearSearchBar = useCallback(() => {
    setSearchBarState(Query.MATCH_ALL);
    setUrlState({ processSearch: '' });
    setSearchText('');
  }, [setUrlState]);

  return (
    <ProcessListContextProvider hostTerm={hostTerm} to={currentTimestamp}>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <SummaryTable
            isLoading={loading}
            processSummary={(!error ? response?.summary : null) ?? { total: 0 }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle data-test-subj="infraAssetDetailsAlertsTitle" size="xxs">
                <span>
                  <FormattedMessage
                    id="xpack.infra.metrics.nodeDetails.processesHeader"
                    defaultMessage="Top processes"
                  />
                </span>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip
                aria-label={i18n.translate(
                  'xpack.infra.metrics.nodeDetails.processesHeader.tooltipLabel',
                  {
                    defaultMessage: 'More info',
                  }
                )}
                size="m"
                type="iInCircle"
                content={i18n.translate(
                  'xpack.infra.metrics.nodeDetails.processesHeader.tooltipBody',
                  {
                    defaultMessage:
                      'The table below aggregates the top CPU and top memory consuming processes. It does not display all processes.',
                  }
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <ProcessesExplanationMessage />
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
              currentTime={currentTimestamp}
              isLoading={loading || !response}
              processList={response?.processList ?? []}
              sortBy={sortBy}
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
                  onClick={reload}
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
