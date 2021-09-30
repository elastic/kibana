/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBasicTable, EuiLink } from '@elastic/eui';

export interface IgnoredQuery {
  label: string;
  suggestionId: string;
  // es-lint-disable-next-line @typescript-eslint/no-explicit-any
  onClick: any;
}

interface Props {
  queries: IgnoredQuery[] | [];
}

export const IgnoredSuggestionsTable: React.FC<Props> = ({ queries }) => {
  const actions = [
    {
      // es-lint-disable-next-line @typescript-eslint/no-explicit-any
      render: (item: any) => {
        return (
          <EuiLink onClick={() => item.onClick(item.label)} color="primary">
            Allow
          </EuiLink>
        );
      },
    },
  ];

  const columns = [
    {
      field: 'label',
      name: 'Query',
      sortable: true,
    },
    {
      name: '',
      actions,
    },
  ];

  return <EuiBasicTable items={queries} itemId="id" columns={columns} />;
};
