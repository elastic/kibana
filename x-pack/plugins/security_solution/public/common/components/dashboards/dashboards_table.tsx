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
import { useSecurityDashboardsTable } from '../../containers/dashboards/use_security_dashboards_table';

/** wait this many ms after the user completes typing before applying the filter input */
const INPUT_TIMEOUT = 250;

const DASHBOARDS_TABLE_SORTING = {
  sort: {
    field: 'title',
    direction: 'asc',
  },
} as const;

export const DashboardsTable: React.FC = () => {
  const { items, columns } = useSecurityDashboardsTable();
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

  return (
    <EuiInMemoryTable
      data-test-subj="dashboardsTable"
      items={filteredItems}
      columns={columns}
      search={search}
      pagination={true}
      sorting={DASHBOARDS_TABLE_SORTING}
    />
  );
};
