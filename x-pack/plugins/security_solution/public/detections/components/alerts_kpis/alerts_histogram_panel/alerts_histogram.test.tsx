/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';

import { AlertsHistogram } from './alerts_histogram';
import { TestProviders } from '../../../../common/mock';

jest.mock('../../../../common/lib/kibana');

const legendItems = [
  {
    color: '#1EA593',
    count: 77,
    dataProviderId:
      'draggable-legend-item-2f890398-548e-4604-b2de-525f0eecd124-kibana_alert_rule_name-matches everything',
    field: 'kibana.alert.rule.name',
    value: 'matches everything',
  },
  {
    color: '#2B70F7',
    count: 56,
    dataProviderId:
      'draggable-legend-item-07aca01b-d334-424d-98c0-6d6bc9f8a886-kibana_alert_rule_name-Endpoint Security',
    field: 'kibana.alert.rule.name',
    value: 'Endpoint Security',
  },
];

const defaultProps = {
  legendItems,
  loading: false,
  data: [],
  from: '2020-07-07T08:20:18.966Z',
  to: '2020-07-08T08:20:18.966Z',
  updateDateRange: jest.fn(),
};

describe('AlertsHistogram', () => {
  it('renders correctly', () => {
    const wrapper = shallow(<AlertsHistogram {...defaultProps} />);

    expect(wrapper.find('Chart').exists()).toBeTruthy();
  });

  it('renders a legend with the default width', () => {
    const wrapper = mount(
      <TestProviders>
        <AlertsHistogram {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="draggable-legend"]').first()).toHaveStyleRule(
      'min-width',
      '165px'
    );
  });

  it('renders a legend with the specified `legendWidth`', () => {
    const legendMinWidth = 1234;

    const wrapper = mount(
      <TestProviders>
        <AlertsHistogram {...defaultProps} legendMinWidth={legendMinWidth} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="draggable-legend"]').first()).toHaveStyleRule(
      'min-width',
      `${legendMinWidth}px`
    );
  });
});
