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
  sort: Sort;
  width: number;
}

const TimelineDiv = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 700px;
  overflow: none;
  user-select: none;
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
    sort,
    width,
  }) => (
    <TimelineDiv data-test-subj="timeline" style={{ width: `${width}px`, height }}>
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
        sort={sort}
        width={width}
      />
    </TimelineDiv>
  )
);
