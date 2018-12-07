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

import { EuiTablePagination } from '@elastic/eui';
import { EventsProps, EventsQuery } from '../../containers/events';
import { Body } from './body';
import { ColumnHeader } from './body/column_headers/column_header';
import { Range } from './body/column_headers/range_picker/ranges';
import { ColumnRenderer } from './body/renderers';
import { RowRenderer } from './body/renderers';
import { Sort } from './body/sort';
import { DataProvider } from './data_providers/data_provider';
import {
  OnChangeItemsPerPage,
  OnChangePage,
  OnColumnSorted,
  OnDataProviderRemoved,
  OnFilterChange,
  OnRangeSelected,
  OnToggleDataProviderEnabled,
} from './events';
import { TimelineHeader } from './header/timeline_header';

interface Props {
  activePage: number;
  columnHeaders: ColumnHeader[];
  columnRenderers: ColumnRenderer[];
  dataProviders: DataProvider[];
  height?: string;
  id: string;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  onChangeItemsPerPage: OnChangeItemsPerPage;
  onChangePage: OnChangePage;
  onColumnSorted: OnColumnSorted;
  onDataProviderRemoved: OnDataProviderRemoved;
  onFilterChange: OnFilterChange;
  onRangeSelected: OnRangeSelected;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  pageCount: number;
  range: Range;
  rowRenderers: RowRenderer[];
  sort: Sort;
  show: boolean;
  width: number;
}

const TimelineDiv = styled.div<{ width: string; height: string }>`
  display: flex;
  flex-direction: column;
  min-height: 700px;
  overflow: hidden;
  user-select: none;
  width: ${props => props.width};
  height: ${props => props.height};
`;

const defaultHeight = '100%';

/** The parent Timeline component */
export const Timeline = pure<Props>(
  ({
    activePage,
    columnHeaders,
    columnRenderers,
    dataProviders,
    height = defaultHeight,
    id,
    itemsPerPage,
    itemsPerPageOptions,
    onChangeItemsPerPage,
    onChangePage,
    onColumnSorted,
    onDataProviderRemoved,
    onFilterChange,
    onRangeSelected,
    onToggleDataProviderEnabled,
    pageCount,
    range,
    rowRenderers,
    show,
    sort,
    width,
  }) => (
    <TimelineDiv data-test-subj="timeline" width={`${width}px`} height={height}>
      <TimelineHeader
        id={id}
        dataProviders={dataProviders}
        onDataProviderRemoved={onDataProviderRemoved}
        onToggleDataProviderEnabled={onToggleDataProviderEnabled}
        show={show}
        width={width}
      />
      {dataProviders.map(provider => {
        const queryProps: EventsProps = provider.componentQueryProps as EventsProps;
        const resParm = provider.componentResultParam;
        return (
          <EventsQuery
            sourceId="default"
            startDate={queryProps.startDate}
            endDate={queryProps.endDate}
            filterQuery={queryProps.filterQuery}
            key={provider.id}
          >
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
          </EventsQuery>
        );
      })}
      {dataProviders.length !== 0 && (
        <div data-test-subj="table-pagination">
          <EuiTablePagination
            activePage={activePage}
            itemsPerPage={itemsPerPage}
            itemsPerPageOptions={itemsPerPageOptions}
            pageCount={pageCount}
            onChangeItemsPerPage={onChangeItemsPerPage}
            onChangePage={onChangePage}
          />
        </div>
      )}
    </TimelineDiv>
  )
);
