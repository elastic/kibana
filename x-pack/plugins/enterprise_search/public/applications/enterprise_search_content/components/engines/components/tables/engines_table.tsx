/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';

import { EngineListDetails, EnginesListTableProps } from '../../types';

import {
  ACTIONS_COLUMN,
  DOCUMENTS,
  ENGINE_NAME,
  INDICES_COUNT_COLUMN,
  LAST_UPDATED_COLUMN,
} from './shared_columns';

export const EnginesTable: React.FC<EnginesListTableProps> = ({
  items,
  loading,
  noItemsMessage,
  pagination,
  onChange,
}) => {
  const columns: Array<EuiBasicTableColumn<EngineListDetails>> = [
    ENGINE_NAME,
    DOCUMENTS,
    LAST_UPDATED_COLUMN,
    INDICES_COUNT_COLUMN,
    ACTIONS_COLUMN,
  ];
  return (
    <EuiBasicTable
      columns={columns}
      items={items}
      loading={loading}
      pagination={pagination}
      onChange={onChange}
      noItemsMessage={noItemsMessage}
    />
  );
};
