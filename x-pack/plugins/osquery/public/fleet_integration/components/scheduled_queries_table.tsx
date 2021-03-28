/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react-perf/jsx-no-new-object-as-prop */

/* eslint-disable react/display-name */

import React, { useMemo } from 'react';
import { EuiInMemoryTable, EuiCodeBlock } from '@elastic/eui';

// @ts-expect-error update types
export const ScheduledQueryQueriesTable = ({ data }) => {
  const columns = useMemo(
    () => [
      {
        field: 'vars.id.value',
        name: 'ID',
      },
      {
        field: 'vars.interval.value',
        name: 'Interval',
      },
      {
        field: 'vars.query.value',
        name: 'Query',
        render: (query: string) => (
          <EuiCodeBlock language="sql" fontSize="s" paddingSize="none" transparentBackground>
            {query}
          </EuiCodeBlock>
        ),
      },
    ],
    []
  );

  const sorting = {
    sort: {
      field: 'vars.id.value',
      direction: 'asc' as const,
    },
  };

  return (
    <EuiInMemoryTable
      items={data.inputs[0].streams}
      itemId="vars.id.value"
      isExpandable={true}
      columns={columns}
      pagination={true}
      sorting={sorting}
    />
  );
};
