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
  EuiSpacer,
  EuiEmptyPrompt,
  EuiButton,
  EuiText,
  EuiIconTip,
  Query,
} from '@elastic/eui';
import { getFieldByType } from '../../../../../../../../common/inventory_models';
import {
  useProcessList,
  SortBy,
  ProcessListContextProvider,
} from '../../../../hooks/use_process_list';
import { TabContent, TabProps } from '../shared';
import { STATE_NAMES } from './states';
import { SummaryTable } from './summary_table';
import { ProcessesTable } from './processes_table';
import { parseSearchString } from './parse_search_string';

const TabComponent = ({ currentTime, node, nodeType }: TabProps) => {
  const [searchBarState, setSearchBarState] = useState<Query>(Query.MATCH_ALL);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>({
    name: 'cpu',
    isAscending: false,
  });

  const hostTerm = useMemo(() => {
    const field = getFieldByType(nodeType) ?? nodeType;
    return { [field]: node.name };
  }, [node, nodeType]);

  const {
    loading,
    error,
    response,
    makeRequest: reload,
  } = useProcessList(hostTerm, currentTime, sortBy, parseSearchString(searchFilter));

  const debouncedSearchOnChange = useMemo(
    () => debounce<(queryText: string) => void>((queryText) => setSearchFilter(queryText), 500),
    [setSearchFilter]
  );

  const searchBarOnChange = useCallback(
    ({ query, queryText }) => {
      setSearchBarState(query);
      debouncedSearchOnChange(queryText);
    },
    [setSearchBarState, debouncedSearchOnChange]
  );

  const clearSearchBar = useCallback(() => {
    setSearchBarState(Query.MATCH_ALL);
    setSearchFilter('');
  }, [setSearchBarState, setSearchFilter]);

  return (
    <TabContent>
      <ProcessListContextProvider hostTerm={hostTerm} to={currentTime}>
        <SummaryTable
          isLoading={loading}
          processSummary={(!error ? response?.summary : null) ?? { total: 0 }}
        />
        <EuiSpacer size="m" />
        <EuiText>
          <h4>
            {i18n.translate('xpack.infra.metrics.nodeDetails.processesHeader', {
              defaultMessage: 'Top processes',
            })}{' '}
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
          </h4>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiSearchBar
          query={searchBarState}
          onChange={searchBarOnChange}
          box={{
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
              options: Object.entries(STATE_NAMES).map(([value, view]: [string, string]) => ({
                value,
                view,
              })),
            },
          ]}
        />
        <EuiSpacer size="m" />
        {!error ? (
          <ProcessesTable
            currentTime={currentTime}
            isLoading={loading || !response}
            processList={response?.processList ?? []}
            sortBy={sortBy}
            setSortBy={setSortBy}
            clearSearchBar={clearSearchBar}
          />
        ) : (
          <EuiEmptyPrompt
            iconType="alert"
            title={
              <h4>
                {i18n.translate('xpack.infra.metrics.nodeDetails.processListError', {
                  defaultMessage: 'Unable to load process data',
                })}
              </h4>
            }
            actions={
              <EuiButton color="primary" fill onClick={reload}>
                {i18n.translate('xpack.infra.metrics.nodeDetails.processListRetry', {
                  defaultMessage: 'Try again',
                })}
              </EuiButton>
            }
          />
        )}
      </ProcessListContextProvider>
    </TabContent>
  );
};

export const ProcessesTab = {
  id: 'processes',
  name: i18n.translate('xpack.infra.metrics.nodeDetails.tabs.processes', {
    defaultMessage: 'Processes',
  }),
  content: TabComponent,
};
