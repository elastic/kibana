/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';
import { StaticIndexPattern } from 'ui/index_patterns';

import { ColumnHeaders } from '../body/column_headers';
import { ColumnHeader } from '../body/column_headers/column_header';
import { Sort } from '../body/sort';
import { DataProviders } from '../data_providers';
import { DataProvider } from '../data_providers/data_provider';
import {
  OnChangeDataProviderKqlQuery,
  OnChangeDroppableAndProvider,
  OnColumnSorted,
  OnDataProviderRemoved,
  OnFilterChange,
  OnRangeSelected,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from '../events';
import { StatefulSearchOrFilter } from '../search_or_filter';

interface Props {
  columnHeaders: ColumnHeader[];
  id: string;
  indexPattern: StaticIndexPattern;
  dataProviders: DataProvider[];
  onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery;
  onChangeDroppableAndProvider: OnChangeDroppableAndProvider;
  onColumnSorted: OnColumnSorted;
  onDataProviderRemoved: OnDataProviderRemoved;
  onFilterChange: OnFilterChange;
  onRangeSelected: OnRangeSelected;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded: OnToggleDataProviderExcluded;
  range: string;
  show: boolean;
  sort: Sort;
}

const TimelineHeaderContainer = styled.div`
  width: 100%;
`;

export const TimelineHeader = pure<Props>(
  ({
    columnHeaders,
    id,
    indexPattern,
    dataProviders,
    onChangeDataProviderKqlQuery,
    onChangeDroppableAndProvider,
    onColumnSorted,
    onDataProviderRemoved,
    onFilterChange,
    onRangeSelected,
    onToggleDataProviderEnabled,
    onToggleDataProviderExcluded,
    range,
    show,
    sort,
  }) => (
    <TimelineHeaderContainer data-test-subj="timelineHeader">
      <DataProviders
        id={id}
        dataProviders={dataProviders}
        onChangeDroppableAndProvider={onChangeDroppableAndProvider}
        onChangeDataProviderKqlQuery={onChangeDataProviderKqlQuery}
        onDataProviderRemoved={onDataProviderRemoved}
        onToggleDataProviderEnabled={onToggleDataProviderEnabled}
        onToggleDataProviderExcluded={onToggleDataProviderExcluded}
        show={show}
      />
      <StatefulSearchOrFilter timelineId={id} indexPattern={indexPattern} />
      <ColumnHeaders
        columnHeaders={columnHeaders}
        onColumnSorted={onColumnSorted}
        onFilterChange={onFilterChange}
        onRangeSelected={onRangeSelected}
        range={range}
        sort={sort}
      />
      <EuiHorizontalRule margin="xs" />
    </TimelineHeaderContainer>
  )
);
