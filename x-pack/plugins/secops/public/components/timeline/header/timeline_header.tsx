/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { Theme } from '../../../store/local/app/model';
import { ColumnHeaders } from '../body/column_headers';
import { ColumnHeader } from '../body/column_headers/column_header';
import { Sort } from '../body/sort';
import { DataProviders } from '../data_providers';
import { DataProvider } from '../data_providers/data_provider';
import {
  OnColumnSorted,
  OnDataProviderRemoved,
  OnFilterChange,
  OnRangeSelected,
  OnToggleDataProviderEnabled,
} from '../events';
import { StatefulSearchOrFilter } from '../search_or_filter';

interface Props {
  columnHeaders: ColumnHeader[];
  id: string;
  dataProviders: DataProvider[];
  onColumnSorted: OnColumnSorted;
  onDataProviderRemoved: OnDataProviderRemoved;
  onFilterChange: OnFilterChange;
  onRangeSelected: OnRangeSelected;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  range: string;
  show: boolean;
  sort: Sort;
  theme: Theme;
}

const TimelineHeaderContainer = styled.div`
  width: 100%;
`;

export const TimelineHeader = pure<Props>(
  ({
    columnHeaders,
    id,
    dataProviders,
    onColumnSorted,
    onDataProviderRemoved,
    onFilterChange,
    onRangeSelected,
    onToggleDataProviderEnabled,
    range,
    show,
    sort,
    theme,
  }) => (
    <TimelineHeaderContainer data-test-subj="timelineHeader">
      <DataProviders
        id={id}
        dataProviders={dataProviders}
        onDataProviderRemoved={onDataProviderRemoved}
        onToggleDataProviderEnabled={onToggleDataProviderEnabled}
        show={show}
        theme={theme}
      />

      <StatefulSearchOrFilter timelineId={id} />

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
