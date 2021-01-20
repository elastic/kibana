/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { Route, Switch } from 'react-router-dom';

import { AnalyticsRouter } from './';

describe('AnalyticsRouter', () => {
  // Detailed route testing is better done via E2E tests
  it('renders', () => {
    const wrapper = shallow(<AnalyticsRouter engineBreadcrumb={['Engines', 'some-engine']} />);

    expect(wrapper.find(Switch)).toHaveLength(1);
    expect(wrapper.find(Route)).toHaveLength(9);
  });
});
