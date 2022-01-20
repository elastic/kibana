/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiInMemoryTable, EuiSearchBarProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CoreStart } from 'kibana/public';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import useInterval from 'react-use/lib/useInterval';
import { TableText } from '../';
import { IManagementSectionsPluginsSetup, SessionsConfigSchema } from '../..';
import { SEARCH_SESSIONS_TABLE_ID } from '../../../../../../../../src/plugins/data/common/';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { getColumns } from '../../lib/get_columns';
import { UISession } from '../../types';
import { OnActionComplete } from '../actions';
import { getAppFilter } from './app_filter';
import { getStatusFilter } from './status_filter';

interface Props {
  core: CoreStart;
  api: SearchSessionsMgmtAPI;
  timezone: string;
  config: SessionsConfigSchema;
  plugins: IManagementSectionsPluginsSetup;
  kibanaVersion: string;
}

export function SearchSessionsMgmtTable({
  core,
  api,
  timezone,
  config,
  plugins,
  kibanaVersion,
  ...props
}: Props) {
  const [tableData, setTableData] = useState<UISession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedIsLoading, setDebouncedIsLoading] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0 });
  const showLatestResultsHandler = useRef<Function>();
  const refreshInterval = useMemo(
    () => moment.duration(config.management.refreshInterval).asMilliseconds(),
    [config.management.refreshInterval]
  );

  // Debounce rendering the state of the Refresh button
  useDebounce(
    () => {
      setDebouncedIsLoading(isLoading);
    },
    250,
    [isLoading]
  );

  // refresh behavior
  const doRefresh = useCallback(async () => {
    setIsLoading(true);
    const renderResults = (results: UISession[]) => {
      setTableData(results);
    };
    showLatestResultsHandler.current = renderResults;
    let results: UISession[] = [];
    try {
      results = await api.fetchTableData();
    } catch (e) {} // eslint-disable-line no-empty

    if (showLatestResultsHandler.current === renderResults) {
      renderResults(results);
      setIsLoading(false);
    }
  }, [api]);

  // initial data load
  useEffect(() => {
    doRefresh();
    plugins.data.search.usageCollector?.trackSessionsListLoaded();
  }, [doRefresh, plugins]);

  useInterval(doRefresh, refreshInterval);

  const onActionComplete: OnActionComplete = () => {
    doRefresh();
  };

  // table config: search / filters
  const search: EuiSearchBarProps = {
    box: { incremental: true },
    filters: [getStatusFilter(tableData), getAppFilter(tableData)],
    toolsRight: (
      <TableText>
        <EuiButton
          fill
          iconType="refresh"
          onClick={doRefresh}
          disabled={debouncedIsLoading}
          isLoading={debouncedIsLoading}
          data-test-subj="sessionManagementRefreshBtn"
        >
          <FormattedMessage
            id="xpack.data.mgmt.searchSessions.search.tools.refresh"
            defaultMessage="Refresh"
          />
        </EuiButton>
      </TableText>
    ),
  };

  return (
    <EuiInMemoryTable<UISession>
      {...props}
      id={SEARCH_SESSIONS_TABLE_ID}
      data-test-subj={SEARCH_SESSIONS_TABLE_ID}
      rowProps={(searchSession: UISession) => ({
        'data-test-subj': `searchSessionsRow`,
        'data-test-search-session-id': `id-${searchSession.id}`,
      })}
      columns={getColumns(core, plugins, api, config, timezone, onActionComplete, kibanaVersion)}
      items={tableData}
      pagination={pagination}
      search={search}
      sorting={{ sort: { field: 'created', direction: 'desc' } }}
      onTableChange={({ page: { index } }) => {
        setPagination({ pageIndex: index });
      }}
      tableLayout="auto"
    />
  );
}
