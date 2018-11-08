/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';
import { ECS } from './ecs';

import { Body } from './body';
import { ColumnHeader } from './body/column_headers/column_header';
import { Range } from './body/column_headers/range_picker/ranges';
import { Sort } from './body/sort';
import { DataProvider } from './data_providers/data_provider';
import { OnColumnSorted, OnDataProviderRemoved, OnFilterChange, OnRangeSelected } from './events';
import { TimelineHeader } from './header/timeline_header';

interface Props {
  columnHeaders: ColumnHeader[];
  data: ECS[];
  dataProviders: DataProvider[];
  height?: string;
  onColumnSorted: OnColumnSorted;
  onDataProviderRemoved: OnDataProviderRemoved;
  onFilterChange: OnFilterChange;
  onRangeSelected: OnRangeSelected;
  range: Range;
  sort: Sort;
  width: number;
}

const TimelineDiv = styled.div<{ width: string; height: string }>`
  display: flex;
  flex-direction: column;
  min-height: 700px;
  overflow: none;
  user-select: none;
  width: ${props => props.width};
  height: ${props => props.height};
`;

const defaultHeight = '100%';

/** The parent Timeline component */
export const Timeline = pure<Props>(
  ({
    columnHeaders,
    dataProviders,
    data,
    height = defaultHeight,
    onColumnSorted,
    onDataProviderRemoved,
    onFilterChange,
    onRangeSelected,
    range,
    sort,
    width,
  }) => (
    <TimelineDiv data-test-subj="timeline" width={`${width}px`} height={height}>
      <TimelineHeader
        dataProviders={dataProviders}
        onDataProviderRemoved={onDataProviderRemoved}
        width={width}
      />
      <Body
        columnHeaders={columnHeaders}
        dataProviders={dataProviders}
        data={data}
        onColumnSorted={onColumnSorted}
        onDataProviderRemoved={onDataProviderRemoved}
        onFilterChange={onFilterChange}
        onRangeSelected={onRangeSelected}
        range={range}
        sort={sort}
        width={width}
      />
    </TimelineDiv>
  )
);
