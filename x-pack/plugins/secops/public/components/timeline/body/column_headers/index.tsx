/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { OnColumnSorted, OnFilterChange, OnRangeSelected } from '../../events';
import { Sort } from '../sort';
import { ColumnHeader } from './column_header';
import { Header } from './header';
import { RangePicker } from './range_picker';

interface Props {
  columnHeaders: ColumnHeader[];
  onColumnSorted?: OnColumnSorted;
  onFilterChange?: OnFilterChange;
  onRangeSelected: OnRangeSelected;
  sort: Sort;
}

const ColumnHeadersSpan = styled.span`
  display: flex;
`;

const ColumnHeaderContainer = styled.div``;

/** Renders the timeline header columns */
export const ColumnHeaders = pure<Props>(
  ({ columnHeaders, onColumnSorted = noop, onFilterChange = noop, onRangeSelected, sort }) => (
    <ColumnHeadersSpan data-test-subj="columnHeaders">
      <RangePicker selected={'1 Day'} onRangeSelected={onRangeSelected} />
      <div
        style={{
          display: 'flex',
          marginLeft: '3px',
          width: '100%',
        }}
      >
        {columnHeaders.map(header => (
          <ColumnHeaderContainer data-test-subj="columnHeaderContainer" key={header.id}>
            <Header
              header={header}
              onColumnSorted={onColumnSorted}
              onFilterChange={onFilterChange}
              sort={sort}
            />
          </ColumnHeaderContainer>
        ))}
      </div>
    </ColumnHeadersSpan>
  )
);
