/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { mockIndicatorsFiltersContext } from '../../../../common/mocks/mock_indicators_filters_context';
import { StoryProvidersComponent } from '../../../../common/mocks/story_providers';
import { generateMockIndicator, Indicator } from '../../../../../common/types/indicator';
import { IndicatorsTable } from '.';
import { IndicatorsFiltersContext } from '../../containers/filters/context';
import { DEFAULT_COLUMNS } from './hooks';

export default {
  component: IndicatorsTable,
  title: 'IndicatorsTable',
};

const mockIndexPattern: DataView = undefined as unknown as DataView;

const stub = () => void 0;

const columnSettings = {
  columnVisibility: {
    visibleColumns: DEFAULT_COLUMNS.map(({ id }) => id),
    setVisibleColumns: stub,
  },
  columns: DEFAULT_COLUMNS,
  handleResetColumns: stub,
  handleToggleColumn: stub,
  sorting: {
    columns: [],
    onSort: stub,
  },
};
export function IndicatorsFullyLoaded() {
  const indicatorsFixture: Indicator[] = Array(10).fill(generateMockIndicator());

  return (
    <StoryProvidersComponent>
      <IndicatorsFiltersContext.Provider value={mockIndicatorsFiltersContext}>
        <IndicatorsTable
          browserFields={{}}
          isLoading={false}
          pagination={{
            pageSize: 10,
            pageIndex: 0,
            pageSizeOptions: [10, 25, 50],
          }}
          indicators={indicatorsFixture}
          onChangePage={stub}
          onChangeItemsPerPage={stub}
          indicatorCount={indicatorsFixture.length * 2}
          indexPattern={mockIndexPattern}
          columnSettings={columnSettings}
        />
      </IndicatorsFiltersContext.Provider>
    </StoryProvidersComponent>
  );
}

export function FirstLoad() {
  return (
    <StoryProvidersComponent>
      <IndicatorsTable
        browserFields={{}}
        pagination={{
          pageSize: 10,
          pageIndex: 0,
          pageSizeOptions: [10, 25, 50],
        }}
        indicators={[]}
        onChangePage={stub}
        onChangeItemsPerPage={stub}
        indicatorCount={0}
        isLoading={true}
        indexPattern={mockIndexPattern}
        columnSettings={columnSettings}
      />
    </StoryProvidersComponent>
  );
}

export function DataUpdateInProgress() {
  const indicatorsFixture: Indicator[] = Array(10).fill(generateMockIndicator());

  return (
    <StoryProvidersComponent>
      <IndicatorsFiltersContext.Provider value={mockIndicatorsFiltersContext}>
        <IndicatorsTable
          browserFields={{}}
          isLoading={false}
          isFetching={true}
          pagination={{
            pageSize: 10,
            pageIndex: 0,
            pageSizeOptions: [10, 25, 50],
          }}
          indicators={indicatorsFixture}
          onChangePage={stub}
          onChangeItemsPerPage={stub}
          indicatorCount={indicatorsFixture.length * 2}
          indexPattern={mockIndexPattern}
          columnSettings={columnSettings}
        />
      </IndicatorsFiltersContext.Provider>
    </StoryProvidersComponent>
  );
}

export function WithNoIndicators() {
  return (
    <StoryProvidersComponent>
      <IndicatorsTable
        browserFields={{}}
        pagination={{
          pageSize: 10,
          pageIndex: 0,
          pageSizeOptions: [10, 25, 50],
        }}
        indicators={[]}
        onChangePage={stub}
        onChangeItemsPerPage={stub}
        indicatorCount={0}
        isLoading={false}
        indexPattern={mockIndexPattern}
        columnSettings={columnSettings}
      />
    </StoryProvidersComponent>
  );
}
