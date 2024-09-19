/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import DateMath from '@elastic/datemath';
import { MonitorCharts } from './monitor_charts';
import { shallowWithRouter } from '../../lib';

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
    expect(component).toMatchSnapshot();
  });
});
