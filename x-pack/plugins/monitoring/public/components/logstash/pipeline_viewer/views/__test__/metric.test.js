/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Metric } from '../metric';
import { shallow } from 'enzyme';

describe('Metric component', () => {
  let metric;

  beforeEach(() => {
    metric = {
      className: 'metricClass',
      warning: true,
      value: '220',
    };
  });

  it('renders warning badge', () => {
    const wrapper = shallow(<Metric {...metric} />);

    expect(wrapper).toMatchSnapshot();
  });

  it('does not render warning badge when no warning present', () => {
    metric.warning = false;
    const wrapper = shallow(<Metric {...metric} />);

    expect(wrapper).toMatchSnapshot();
  });
});
