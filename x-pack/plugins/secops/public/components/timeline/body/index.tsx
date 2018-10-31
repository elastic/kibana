/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';
import { DataProvider } from '../data_providers/data_provider';
import { OnColumnSorted, OnDataProviderRemoved, OnFilterChange, OnRangeSelected } from '../events';
import { ColumnHeaders } from './column_headers';
import { ColumnHeader } from './column_headers/column_header';
import { Sort } from './sort';

interface Props {
  columnHeaders: ColumnHeader[];
  dataProviders: DataProvider[];
  onColumnSorted: OnColumnSorted;
  onDataProviderRemoved: OnDataProviderRemoved;
  onFilterChange: OnFilterChange;
  onRangeSelected: OnRangeSelected;
  sort: Sort;
  width: number;
}

/** Renders the timeline body */
export const Body = pure<Props>(
  ({ columnHeaders, onColumnSorted, onFilterChange, onRangeSelected, sort, width }) => (
    <div
      data-test-subj="body"
      style={{
        display: 'flex',
        flexDirection: 'column',
        margin: '5px',
        overflow: 'scroll',
        width: `${width - 10}px`,
      }}
    >
      <ColumnHeaders
        columnHeaders={columnHeaders}
        onColumnSorted={onColumnSorted}
        onFilterChange={onFilterChange}
        onRangeSelected={onRangeSelected}
        sort={sort}
      />
    </div>
  )
);
