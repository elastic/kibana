/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getOr } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';
import { ECS } from './ecs';

import { Body } from './body';
import { ColumnHeader } from './body/column_headers/column_header';
import { Range } from './body/column_headers/range_picker/ranges';
import { ColumnRenderer } from './body/renderers';
import { RowRenderer } from './body/renderers';
import { Sort } from './body/sort';
import { DataProvider } from './data_providers/data_provider';
import {
  OnColumnSorted,
  OnDataProviderRemoved,
  OnFilterChange,
  OnRangeSelected,
  OnToggleDataProviderEnabled,
} from './events';
import { TimelineHeader } from './header/timeline_header';

interface Props {
  columnHeaders: ColumnHeader[];
  columnRenderers: ColumnRenderer[];
  dataProviders: DataProvider[];
  height?: string;
  onColumnSorted: OnColumnSorted;
  onDataProviderRemoved: OnDataProviderRemoved;
  onFilterChange: OnFilterChange;
  onRangeSelected: OnRangeSelected;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  range: Range;
  rowRenderers: RowRenderer[];
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
    columnRenderers,
    dataProviders,
    height = defaultHeight,
    onColumnSorted,
    onDataProviderRemoved,
    onFilterChange,
    onRangeSelected,
    onToggleDataProviderEnabled,
    range,
    rowRenderers,
    sort,
    width,
  }) => (
    <TimelineDiv data-test-subj="timeline" width={`${width}px`} height={height}>
      <TimelineHeader
        dataProviders={dataProviders}
        onDataProviderRemoved={onDataProviderRemoved}
        onToggleDataProviderEnabled={onToggleDataProviderEnabled}
        width={width}
      />
      {dataProviders.map(provider => {
        const QueryComponent = provider.componentQuery as React.ComponentClass;
        const queryProps = provider.componentQueryProps;
        const resParm = provider.componentResultParam;
        return (
          <QueryComponent {...queryProps} key={provider.id}>
            {(resData: {}) => (
              <Body
                columnHeaders={columnHeaders}
                columnRenderers={columnRenderers}
                data={getOr([], resParm, resData) as ECS[]}
                onColumnSorted={onColumnSorted}
                onDataProviderRemoved={onDataProviderRemoved}
                onFilterChange={onFilterChange}
                onRangeSelected={onRangeSelected}
                range={range}
                rowRenderers={rowRenderers}
                sort={sort}
                width={width}
              />
            )}
          </QueryComponent>
        );
      })}
    </TimelineDiv>
  )
);
