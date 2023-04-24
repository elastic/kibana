/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { mount, shallow } from 'enzyme';

import moment from 'moment';

import { AreaSeries, Chart } from '@elastic/charts';
import { EuiLoadingChart } from '@elastic/eui';

import { FilterBy } from '../../../utils/get_formula_by_filter';

import { AnalyticsCollectionChart } from './analytics_collection_chart';

describe('AnalyticsCollectionChart', () => {
  const mockedData = Object.values(FilterBy).reduce(
    (result, id) => ({
      ...result,
      [id]: [
        [100, 200],
        [200, 300],
      ],
    }),
    {}
  );
  const mockedTimeRange = {
    from: moment().subtract(7, 'days').toISOString(),
    to: moment().toISOString(),
  };

  const defaultProps = {
    data: {},
    isLoading: false,
    selectedChart: FilterBy.Searches,
    setSelectedChart: jest.fn(),
    timeRange: mockedTimeRange,
  };

  beforeEach(() => {
    setMockValues({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render chart and metrics for each chart', () => {
    const component = shallow(<AnalyticsCollectionChart {...defaultProps} />);
    expect(component.find(Chart)).toHaveLength(1);
    expect(component.find(AreaSeries)).toHaveLength(4);
  });

  it('should render a loading indicator if loading and have not data', () => {
    const component = shallow(<AnalyticsCollectionChart {...defaultProps} data={{}} isLoading />);
    expect(component.find(EuiLoadingChart).exists()).toBeTruthy();
  });

  it('should not render a loading indicator if loading but have data', () => {
    const component = mount(<AnalyticsCollectionChart {...defaultProps} isLoading />);
    component.update();
    component.setProps({ data: mockedData });
    component.update();
    expect(component.find(EuiLoadingChart).exists()).toBeFalsy();
  });
});
