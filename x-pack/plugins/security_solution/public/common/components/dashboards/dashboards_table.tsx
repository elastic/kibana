/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Search } from '@elastic/eui';
import { EuiInMemoryTable } from '@elastic/eui';
import {
  useSecurityDashboardsTableItems,
  useDashboardsTableColumns,
} from '../../containers/dashboards/use_security_dashboards';

const DASHBOARDS_TABLE_SEARCH: Search = {
  box: {
    incremental: true,
  },
} as const;

export const DashboardsTable: React.FC = () => {
  const items = useSecurityDashboardsTableItems();
  const columns = useDashboardsTableColumns();

  return (
    <EuiInMemoryTable
      data-test-subj="dashboards-table"
      items={items}
      columns={columns}
      search={DASHBOARDS_TABLE_SEARCH}
      pagination={true}
      sorting={true}
    />
  );
};
