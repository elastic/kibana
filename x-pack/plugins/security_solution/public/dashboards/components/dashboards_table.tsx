/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash';
import type { Search } from '@elastic/eui';
import { EuiInMemoryTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  useSecurityDashboardsTableItems,
  useSecurityDashboardsTableColumns,
} from '../hooks/use_security_dashboards_table';
import { useAppToasts } from '../../common/hooks/use_app_toasts';

export const DASHBOARDS_QUERY_ERROR = i18n.translate(
  'xpack.securitySolution.dashboards.queryError',
  {
    defaultMessage: 'Error retrieving security dashboards',
  }
);

/** wait this many ms after the user completes typing before applying the filter input */
const INPUT_TIMEOUT = 250;

const DASHBOARDS_TABLE_SORTING = {
  sort: {
    field: 'title',
    direction: 'asc',
  },
} as const;

export const DashboardsTable: React.FC = () => {
  const { items, isLoading, error } = useSecurityDashboardsTableItems();
  const columns = useSecurityDashboardsTableColumns();
  const { addError } = useAppToasts();

  const [filteredItems, setFilteredItems] = useState(items);
  const [searchQuery, setSearchQuery] = useState('');

  const search = useMemo<Search>(() => {
    const debouncedSetSearchQuery = debounce(setSearchQuery, INPUT_TIMEOUT);

    return {
      onChange: ({ queryText }) => {
        debouncedSetSearchQuery(queryText.toLowerCase() ?? '');
      },
      box: {
        incremental: true,
      },
    };
  }, []);

  useEffect(() => {
    if (searchQuery.length === 0) {
      setFilteredItems(items);
    } else {
      setFilteredItems(
        items.filter(({ title, description }) => {
          const normalizedName = `${title} ${description}`.toLowerCase();
          return normalizedName.includes(searchQuery.replace(/[^\w- ]/g, ''));
        })
      );
    }
  }, [items, searchQuery]);

  useEffect(() => {
    if (error) {
      addError(error, { title: DASHBOARDS_QUERY_ERROR });
    }
  }, [error, addError]);

  return (
    <EuiInMemoryTable
      data-test-subj="dashboardsTable"
      items={filteredItems}
      columns={columns}
      search={search}
      pagination={true}
      sorting={DASHBOARDS_TABLE_SORTING}
      loading={isLoading}
    />
  );
};
