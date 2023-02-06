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
import { CHART_UPDATE_PROGRESS_TEST_ID, IndicatorsBarChartWrapper } from '.';
import moment from 'moment';

jest.mock('../../../query_bar/hooks/use_filters');

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

const mockTimeRange: TimeRange = { from: '', to: '' };

describe('<IndicatorsBarChartWrapper />', () => {
  describe('when not loading or refetching', () => {
    it('should render barchart and field selector dropdown', () => {
      const component = render(
        <TestProvidersComponent>
          <IndicatorsBarChartWrapper
            dateRange={{ max: moment(), min: moment() }}
            series={[]}
            field=""
            onFieldChange={jest.fn()}
            indexPattern={mockIndexPattern}
            timeRange={mockTimeRange}
            isFetching={false}
            isLoading={false}
          />
        </TestProvidersComponent>
      );

      expect(component.asFragment()).toMatchSnapshot();
    });
  });

  describe('when loading for the first time', () => {
    it('should render progress indicator', () => {
      const component = render(
        <TestProvidersComponent>
          <IndicatorsBarChartWrapper
            dateRange={{ max: moment(), min: moment() }}
            series={[]}
            field=""
            onFieldChange={jest.fn()}
            indexPattern={mockIndexPattern}
            timeRange={mockTimeRange}
            isFetching={false}
            isLoading={true}
          />
        </TestProvidersComponent>
      );

      expect(component.queryByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('when updating the data', () => {
    it('should render progress indicator', () => {
      const component = render(
        <TestProvidersComponent>
          <IndicatorsBarChartWrapper
            dateRange={{ max: moment(), min: moment() }}
            series={[]}
            field=""
            onFieldChange={jest.fn()}
            indexPattern={mockIndexPattern}
            timeRange={mockTimeRange}
            isFetching={true}
            isLoading={false}
          />
        </TestProvidersComponent>
      );

      expect(component.queryByTestId(CHART_UPDATE_PROGRESS_TEST_ID)).toBeInTheDocument();
    });
  });
});
