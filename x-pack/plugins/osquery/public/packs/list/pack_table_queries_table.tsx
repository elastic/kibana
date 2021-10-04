/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiCodeBlock } from '@elastic/eui';
import React from 'react';

const columns = [
  {
    field: 'id',
    name: 'ID',
  },
  {
    field: 'name',
    name: 'Query name',
  },
  {
    field: 'interval',
    name: 'Query interval',
  },
  {
    field: 'query',
    name: 'Query',
    render: (query: string) => (
      <EuiCodeBlock language="sql" fontSize="s" paddingSize="s">
        {query}
      </EuiCodeBlock>
    ),
  },
];

// @ts-expect-error update types
const PackTableQueriesTableComponent = ({ items }) => {
  return <EuiBasicTable compressed items={items} rowHeader="id" columns={columns} />;
};

export const PackTableQueriesTable = React.memo(PackTableQueriesTableComponent);
