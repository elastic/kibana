/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiInMemoryTable, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  TableSearchBar,
  getItemsFilteredBySearchQuery,
} from '../../../shared/table_search_bar/table_search_bar';
import { getColumns } from './get_columns';
import type { ErrorFromLogsRow } from './use_service_errors_from_logs';

interface Props {
  items: ErrorFromLogsRow[];
  rangeFrom: string;
  rangeTo: string;
  logsIndexPattern: string | undefined;
  tableCaption: string;
  noItemsMessage?: React.ReactNode;
  /** Pass-through to EuiInMemoryTable — shows a spinner while a new page/query loads. */
  loading?: boolean;
  /**
   * When true: 5 rows, no per-page options, no Type column, no search bar.
   * Mirrors ErrorGroupList's `isCompactMode` for the service Overview.
   */
  isCompactMode?: boolean;
  /** When true the endpoint returned more than 500 rows and truncated. Affects the
   *  search empty-state message so users know the search only covers the displayed rows. */
  maxCountExceeded?: boolean;
}

export function ErrorsFromLogsTable({
  items,
  rangeFrom,
  rangeTo,
  logsIndexPattern,
  tableCaption,
  noItemsMessage,
  loading = false,
  isCompactMode = false,
  maxCountExceeded = false,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');

  const columns = getColumns({ rangeFrom, rangeTo, logsIndexPattern, isCompactMode });

  const filteredItems =
    searchQuery.length > 0
      ? getItemsFilteredBySearchQuery({
          items,
          fieldsToSearch: ['message', 'type'],
          searchQuery,
        })
      : items;

  // When a search is active, the 500-row cap means "no results" may be a false
  // negative: the searched term could exist in older logs beyond the cap. Surface
  // a scoped message so users know to widen their query via the KQL bar instead.
  const emptyMessage =
    searchQuery.length > 0 && filteredItems.length === 0 && maxCountExceeded
      ? i18n.translate('xpack.apm.errorsFromLogs.noSearchResultsTruncated', {
          defaultMessage:
            'No matching errors found in the 500 most recent logs. Use the KQL bar to search all logs.',
        })
      : noItemsMessage;

  return (
    <>
      {!isCompactMode && (
        <>
          <TableSearchBar
            placeholder={i18n.translate('xpack.apm.errorsFromLogs.filterPlaceholder', {
              defaultMessage: 'Search errors by message or type',
            })}
            searchQuery={searchQuery}
            onChangeSearchQuery={setSearchQuery}
            dataTestSubj="errorsFromLogsTableSearchInput"
          />
          <EuiSpacer size="s" />
        </>
      )}
      <EuiInMemoryTable
        tableCaption={tableCaption}
        items={filteredItems}
        columns={columns}
        sorting={{ sort: { field: 'timestampUs', direction: 'desc' } }}
        pagination={{
          showPerPageOptions: !isCompactMode,
          pageSize: isCompactMode ? 5 : 10,
        }}
        noItemsMessage={emptyMessage}
        loading={loading}
        compressed
      />
    </>
  );
}
