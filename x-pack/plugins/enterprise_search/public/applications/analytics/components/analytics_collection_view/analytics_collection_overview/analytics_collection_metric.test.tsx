/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiI18nNumber } from '@elastic/eui';

import { AnalyticsCollectionViewMetric } from './analytics_collection_metric';

const mockProps = {
  dataViewQuery: 'test',
  getFormula: jest.fn(),
  isLoading: false,
  isSelected: false,
  metric: 100,
  name: 'Test metric',
  onClick: jest.fn(),
  secondaryMetric: 50,
};

describe('AnalyticsCollectionViewMetric', () => {
  it('should render component without issues', () => {
    const wrapper = shallow(<AnalyticsCollectionViewMetric {...mockProps} />);
    expect(wrapper).toBeDefined();
  });

  it('should show N/A if metric is null', () => {
    const wrapper = shallow(
      <AnalyticsCollectionViewMetric {...mockProps} metric={null} secondaryMetric={null} />
    );
    expect(wrapper.find(EuiI18nNumber)).toHaveLength(0);
    expect(wrapper.find('h2').text()).toContain('N/A');
  });

  it('should show the metric value if it is not null', () => {
    const wrapper = shallow(<AnalyticsCollectionViewMetric {...mockProps} />);
    expect(wrapper.find(EuiI18nNumber)).toHaveLength(1);
    expect(wrapper.find(EuiI18nNumber).prop('value')).toEqual(mockProps.metric);
  });

  it('should show N/A if secondary metric is null', () => {
    const wrapper = shallow(
      <AnalyticsCollectionViewMetric {...mockProps} secondaryMetric={null} />
    );
    expect(wrapper.find('span').text()).toContain('N/A');
  });

  it('should show the secondary metric value if it is not null', () => {
    const wrapper = shallow(<AnalyticsCollectionViewMetric {...mockProps} />);
    expect(wrapper.find('span').text()).toContain(`${mockProps.secondaryMetric}%`);
  });
});
