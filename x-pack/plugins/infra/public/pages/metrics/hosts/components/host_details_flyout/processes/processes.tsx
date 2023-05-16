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
import type { InventoryItemType } from '../../../../../../../common/inventory_models/types';
import { getFieldByType } from '../../../../../../../common/inventory_models';
import { parseSearchString } from '../../../../inventory_view/components/node_details/tabs/processes/parse_search_string';
import { ProcessesTable } from '../../../../inventory_view/components/node_details/tabs/processes/processes_table';
import { STATE_NAMES } from '../../../../inventory_view/components/node_details/tabs/processes/states';
import { SummaryTable } from '../../../../inventory_view/components/node_details/tabs/processes/summary_table';
import { TabContent } from '../../../../inventory_view/components/node_details/tabs/shared';
import {
  SortBy,
  useProcessList,
  ProcessListContextProvider,
} from '../../../../inventory_view/hooks/use_process_list';
import type { HostNodeRow } from '../../../hooks/use_hosts_table';
import { useHostFlyoutOpen } from '../../../hooks/use_host_flyout_open_url_state';

export interface ProcessesProps {
  node: HostNodeRow;
  nodeType: InventoryItemType;
  currentTime: number;
}

const options = Object.entries(STATE_NAMES).map(([value, view]: [string, string]) => ({
  value,
  view,
}));

export const Processes = ({ currentTime, node, nodeType }: ProcessesProps) => {
  const [hostFlyoutOpen, setHostFlyoutOpen] = useHostFlyoutOpen();
  const [searchBarState, setSearchBarState] = useState<Query>(() =>
    hostFlyoutOpen.searchFilter ? Query.parse(hostFlyoutOpen.searchFilter) : Query.MATCH_ALL
  );

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
  } = useProcessList(
    hostTerm,
    currentTime,
    sortBy,
    parseSearchString(hostFlyoutOpen.searchFilter ?? '')
  );

  const debouncedSearchOnChange = useMemo(
    () =>
      debounce<(queryText: string) => void>(
        (queryText) => setHostFlyoutOpen({ searchFilter: queryText }),
        500
      ),
    [setHostFlyoutOpen]
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
    setHostFlyoutOpen({ searchFilter: '' });
  }, [setHostFlyoutOpen]);

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
              options,
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
            iconType="warning"
            title={
              <h4>
                {i18n.translate('xpack.infra.metrics.nodeDetails.processListError', {
                  defaultMessage: 'Unable to load process data',
                })}
              </h4>
            }
            actions={
              <EuiButton
                data-test-subj="infraTabComponentTryAgainButton"
                color="primary"
                fill
                onClick={reload}
              >
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
