/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable react/display-name */

import React from 'react';
import { EuiButtonIcon, EuiBasicTableColumn } from '@elastic/eui';
import { ExceptionListSchema } from '../../../../../../shared_imports';

export type AllExceptionListsColumns = EuiBasicTableColumn<ExceptionListSchema>;

export const getAllExceptionListsColumns = (
  onExport: Func,
  onDelete: Func
): AllExceptionListsColumns[] => [
  {
    align: 'left',
    field: 'list_id',
    name: 'Exception ID',
    truncateText: true,
    dataType: 'string',
    width: '100px',
  },
  {
    align: 'left',
    field: 'rules',
    name: 'Number of rules applied to',
    truncateText: true,
    dataType: 'number',
    width: '14%',
    render: (value) => {
      return <p>{value.length}</p>;
    },
  },
  {
    align: 'left',
    field: 'rules',
    name: 'Rules applied to',
    truncateText: true,
    dataType: 'string',
    width: '14%',
    render: (value) => {
      return <p>{value.map((a) => a.ruleName).join(', ')}</p>;
    },
  },
  {
    align: 'left',
    field: 'created_at',
    name: 'Date created',
    truncateText: true,
    dataType: 'date',
    width: '14%',
  },
  {
    align: 'left',
    field: 'updated_at',
    name: 'Last edited',
    truncateText: true,
    width: '14%',
  },
  {
    align: 'center',
    isExpander: false,
    width: '20px',
    render: () => (
      <EuiButtonIcon
        onClick={onExport}
        aria-label="Export exception list"
        iconType="exportAction"
      />
    ),
  },
  {
    align: 'center',
    width: '20px',
    isExpander: false,
    render: () => (
      <EuiButtonIcon
        color="danger"
        onClick={onDelete}
        aria-label="Delete exception list"
        iconType="trash"
      />
    ),
  },
];
