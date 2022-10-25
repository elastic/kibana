/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable } from '@elastic/eui';
import type { SnapshotNode } from '../../../../../common/http_api';
import { HostsTableColumns } from './hosts_table_columns';
import { useHostTable } from '../hooks/use_host_table';

interface Props {
  nodes: SnapshotNode[];
}

export const HostsTable: React.FunctionComponent<Props> = ({ nodes }) => {
  const items = useHostTable(nodes);

  return (
    <EuiBasicTable
      tableCaption="Infrastructure metrics for hosts"
      items={items}
      columns={HostsTableColumns}
    />
  );
};
