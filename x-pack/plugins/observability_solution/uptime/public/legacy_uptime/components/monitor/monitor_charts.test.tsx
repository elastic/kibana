/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import DateMath from '@kbn/datemath';
import React from 'react';
import { shallowWithRouter } from '../../lib';
import { MonitorCharts } from './monitor_charts';

describe('MonitorCharts component', () => {
  let dateMathSpy: any;
  const MOCK_DATE_VALUE = 20;

  beforeEach(() => {
    dateMathSpy = jest.spyOn(DateMath, 'parse');
    dateMathSpy.mockReturnValue(MOCK_DATE_VALUE);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component without errors', () => {
    const component = shallowWithRouter(<MonitorCharts monitorId="something" />);
    // dive() removes all unnecessary React-Router wrapping elements
    expect(component.dive()).toMatchSnapshot();
  });
});
