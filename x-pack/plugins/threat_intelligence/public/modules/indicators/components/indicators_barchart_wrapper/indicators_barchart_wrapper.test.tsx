/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TimeRange } from '@kbn/es-query';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { TestProvidersComponent } from '../../../../common/mocks/test_providers';
import { IndicatorsBarChartWrapper } from './indicators_barchart_wrapper';
import { DEFAULT_TIME_RANGE } from '../../hooks/use_filters/utils';
import { useFilters } from '../../hooks/use_filters';

jest.mock('../../hooks/use_filters');

const mockIndexPattern: DataView = {
  fields: [
    {
      name: '@timestamp',
      type: 'date',
    } as DataViewField,
    {
      name: 'threat.feed.name',
      type: 'string',
    } as DataViewField,
  ],
} as DataView;

const mockTimeRange: TimeRange = DEFAULT_TIME_RANGE;

const stub = () => {};

describe('<IndicatorsBarChartWrapper />', () => {
  beforeEach(() => {
    (useFilters as jest.MockedFunction<typeof useFilters>).mockReturnValue({
      filters: [],
      filterQuery: { language: 'kuery', query: '' },
      filterManager: {} as any,
      handleSavedQuery: stub,
      handleSubmitQuery: stub,
      handleSubmitTimeRange: stub,
    });
  });
  it('should render barchart and field selector dropdown', () => {
    const component = render(
      <TestProvidersComponent>
        <IndicatorsBarChartWrapper indexPattern={mockIndexPattern} timeRange={mockTimeRange} />
      </TestProvidersComponent>
    );

    expect(component).toMatchSnapshot();
  });
});
