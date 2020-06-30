/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { LatestTypes } from './latest_types';

describe('Latest Types', () => {
  test('that latest active component renders normally', () => {
    const latestTypes = [
      { type: 'Packetbeat', count: 4 },
      { type: 'Metricbeat', count: 4 },
      { type: 'Heartbeat', count: 2 },
    ];

    const component = shallow(<LatestTypes latestTypes={latestTypes} />);

    expect(component).toMatchSnapshot();
  });
});
