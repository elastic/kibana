/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { LatestActive } from './latest_active';

describe('Latest Active', () => {
  test('that latest active component renders normally', () => {
    const latestActive = [
      { range: 'last1m', count: 5 },
      { range: 'last5m', count: 5 },
      { range: 'last20m', count: 5 },
      { range: 'last1h', count: 6 },
      { range: 'last1d', count: 10 },
    ];

    const component = shallow(<LatestActive latestActive={latestActive} />);

    expect(component).toMatchSnapshot();
  });
});
