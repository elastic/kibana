/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiInMemoryTable, EuiSearchBarProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { HttpStart, IUiSettingsClient } from 'kibana/public';
import React, { useEffect, useState } from 'react';
import * as Rx from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TableText } from '../';
import {
  ActionComplete,
  REFRESH_INTERVAL_MS,
  UISession,
} from '../../../../../common/search/sessions_mgmt';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { getColumns } from '../../lib/get_columns';
import { getAppFilter } from './app_filter';
import { getStatusFilter } from './status_filter';

const TABLE_ID = 'backgroundSessionsMgmtTable';

interface Props {
  api: SearchSessionsMgmtAPI;
  http: HttpStart;
  initialTable: UISession[] | null;
  uiSettings: IUiSettingsClient;
}

export function SearchSessionsMgmtTable({ api, http, uiSettings, initialTable, ...props }: Props) {
  const [tableData, setTableData] = useState<UISession[]>(initialTable ? initialTable : []);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0 });

  // refresh behavior
  const doRefresh = async () => {
    setIsLoading(true);
    await api.fetchTableData().then((results) => {
      if (results) {
        setTableData(results);
      }
    });
    setIsLoading(false);
  };

  // 3s auto-refresh
  useEffect(() => {
    const refreshRx = Rx.interval(REFRESH_INTERVAL_MS).pipe(switchMap(doRefresh)).subscribe();

    return () => {
      refreshRx.unsubscribe();
    };
  });

  // When action such as cancel, delete, extend occurs, use the async return
  // value to refresh the table
  const handleActionCompleted: ActionComplete = (results: UISession[] | null) => {
    if (results) {
      setTableData(results);
    }
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
          disabled={isLoading}
          isLoading={isLoading}
        >
          <FormattedMessage
            id="xpack.data.mgmt.searchSessions.search.tools.refresh"
            defaultMessage="Refresh"
          />
        </EuiButton>
      </TableText>
    ),
  };

  // table config: sorting
  const sorting = { sort: { field: 'startedDate', direction: 'desc' as 'desc' } };

  //
  return (
    <EuiInMemoryTable<UISession>
      {...props}
      id={TABLE_ID}
      data-test-subj={TABLE_ID}
      columns={getColumns(api, http, uiSettings, handleActionCompleted)}
      items={tableData}
      pagination={pagination}
      search={search}
      sorting={sorting}
      onTableChange={({ page: { index } }) => {
        setPagination({ pageIndex: index });
      }}
      tableLayout="auto"
    />
  );
}
