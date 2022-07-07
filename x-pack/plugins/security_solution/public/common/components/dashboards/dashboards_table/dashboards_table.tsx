/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTableColumn, EuiInMemoryTable, Search } from '@elastic/eui';
import {
  useSecurityDashboards,
  SecurityDashboardItem,
} from '../../../containers/dashboards/use_security_dashboards';

const DASHBOARDS_TABLE_SEARCH: Search = {
  box: {
    incremental: true,
  },
};

// TODO: translate
const DASHBOARDS_TABLE_COLUMNS: Array<EuiBasicTableColumn<SecurityDashboardItem>> = [
  { field: 'title', name: 'Title' },
  { field: 'description', name: 'Description' },
  { field: 'tags', name: 'Tags' },
];

export const DashboardsTable: React.FC = () => {
  const items = useSecurityDashboards();
  return (
    <EuiInMemoryTable
      data-test-subj="dashboards-table"
      items={items}
      //   itemId="name"
      columns={DASHBOARDS_TABLE_COLUMNS}
      search={DASHBOARDS_TABLE_SEARCH}
      pagination={true}
      sorting={true}
    />
  );
};
