/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as fp from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import { OnColumnSorted, OnFilterChange, OnRangeSelected } from '../../events';
import { Sort } from '../sort/sort';
import { ColumnHeader } from './column_header';
import { Header } from './header';
import { RangePicker } from './range_picker/range_picker';

interface Props {
  columnHeaders: ColumnHeader[];
  onColumnSorted?: OnColumnSorted;
  onFilterChange?: OnFilterChange;
  onRangeSelected: OnRangeSelected;
  sort: Sort;
}

/** Renders the timeline header columns */
export const ColumnHeaders = pure<Props>(
  ({
    columnHeaders,
    onColumnSorted = fp.noop,
    onFilterChange = fp.noop,
    onRangeSelected,
    sort,
  }) => (
    <div
      data-test-subj="columnHeaders"
      style={{
        display: 'flex',
      }}
    >
      <RangePicker selected={'1 Day'} onRangeSelected={onRangeSelected} />
      {columnHeaders.map(h => (
        <div
          data-test-subj="columnHeaderContainer"
          key={h.id}
          style={{
            margin: '3px',
          }}
        >
          <Header
            header={h}
            onColumnSorted={onColumnSorted}
            onFilterChange={onFilterChange}
            sort={sort}
          />
        </div>
      ))}
    </div>
  )
);
