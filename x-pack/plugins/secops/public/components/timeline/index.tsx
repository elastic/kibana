/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';
import { Body } from './body';
import { ColumnHeader } from './body/column_headers/column_header';
import { Sort } from './body/sort';
import { DataProvider } from './data_providers/data_provider';
import { OnColumnSorted, OnDataProviderRemoved, OnFilterChange, OnRangeSelected } from './events';
import { TimelineHeader } from './header/timeline_header';

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

/** The parent Timeline component */
export const Timeline = pure<Props>(
  ({
    columnHeaders,
    dataProviders,
    onColumnSorted,
    onDataProviderRemoved,
    onFilterChange,
    onRangeSelected,
    sort,
    width,
  }) => (
    <div
      data-test-subj="timeline"
      style={{
        border: '1px solid black',
        borderRadius: '10px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '700px',
        overflow: 'none',
        userSelect: 'none',
        width: `${width}px`,
      }}
    >
      <TimelineHeader
        dataProviders={dataProviders}
        onDataProviderRemoved={onDataProviderRemoved}
        width={width}
      />
      <Body
        columnHeaders={columnHeaders}
        dataProviders={dataProviders}
        onColumnSorted={onColumnSorted}
        onDataProviderRemoved={onDataProviderRemoved}
        onFilterChange={onFilterChange}
        onRangeSelected={onRangeSelected}
        sort={sort}
        width={width}
      />
    </div>
  )
);
