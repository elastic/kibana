/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MonitorLocation } from '../../../../../common/runtime_types/monitor';
import { LocationStatusTags } from './index';
import { mockMoment } from '../../../../lib/helper/test_helpers';
import { render } from '../../../../lib/helper/rtl_helpers';

mockMoment();

describe('LocationStatusTags component', () => {
  let monitorLocations: MonitorLocation[];

  it('renders properly against props', async () => {
    monitorLocations = [
      {
        summary: { up: 4, down: 0 },
        geo: { name: 'Islamabad', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: 'Oct 26, 2020 7:49:20 AM',
        up_history: 4,
        down_history: 0,
      },
      {
        summary: { up: 4, down: 0 },
        geo: { name: 'Berlin', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: 'Oct 26, 2020 7:49:20 AM',
        up_history: 4,
        down_history: 2,
      },
      {
        summary: { up: 0, down: 2 },
        geo: { name: 'Berlin', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: 'Oct 26, 2020 7:49:20 AM',
        up_history: 4,
        down_history: 1,
      },
    ];
    const { findByText } = render(<LocationStatusTags locations={monitorLocations} />);
    expect(await findByText('100.00 %')).toBeInTheDocument();
  });

  it('renders when there are many location', async () => {
    monitorLocations = [
      {
        summary: { up: 0, down: 1 },
        geo: { name: 'Islamabad', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: 'Oct 26, 2020 7:49:20 AM',
        up_history: 4,
        down_history: 0,
      },
      {
        summary: { up: 0, down: 1 },
        geo: { name: 'Berlin', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: 'Oct 26, 2020 7:49:20 AM',
        up_history: 4,
        down_history: 3,
      },
      {
        summary: { up: 0, down: 1 },
        geo: { name: 'st-paul', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: 'Oct 26, 2020 7:49:20 AM',
        up_history: 4,
        down_history: 2,
      },
      {
        summary: { up: 0, down: 1 },
        geo: { name: 'Tokyo', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: 'Oct 26, 2020 7:49:20 AM',
        up_history: 4,
        down_history: 1,
      },
      {
        summary: { up: 0, down: 1 },
        geo: { name: 'New York', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: 'Oct 26, 2020 7:49:20 AM',
        up_history: 4,
        down_history: 4,
      },
      {
        summary: { up: 0, down: 1 },
        geo: { name: 'Toronto', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: 'Oct 26, 2020 7:49:20 AM',
        up_history: 4,
        down_history: 0,
      },
      {
        summary: { up: 0, down: 1 },
        geo: { name: 'Sydney', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: 'Oct 26, 2020 7:49:20 AM',
        up_history: 4,
        down_history: 0,
      },
      {
        summary: { up: 0, down: 1 },
        geo: { name: 'Paris', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: 'Oct 26, 2020 7:49:20 AM',
        up_history: 4,
        down_history: 0,
      },
    ];
    const { findAllByText } = render(<LocationStatusTags locations={monitorLocations} />);
    expect(await findAllByText('100.00 %')).toHaveLength(3);
  });

  it('renders when all locations are up', async () => {
    monitorLocations = [
      {
        summary: { up: 4, down: 0 },
        geo: { name: 'Islamabad', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: 'Oct 26, 2020 7:49:20 AM',
        up_history: 4,
        down_history: 0,
      },
      {
        summary: { up: 4, down: 0 },
        geo: { name: 'Berlin', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: 'Oct 26, 2020 7:49:20 AM',
        up_history: 4,
        down_history: 0,
      },
    ];
    const { findAllByText } = render(<LocationStatusTags locations={monitorLocations} />);
    expect(await findAllByText('100.00 %')).toHaveLength(2);
  });

  it('renders when all locations are down', async () => {
    monitorLocations = [
      {
        summary: { up: 0, down: 2 },
        geo: { name: 'Islamabad', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: 'Oct 26, 2020 7:49:20 AM',
        up_history: 0,
        down_history: 2,
      },
      {
        summary: { up: 0, down: 2 },
        geo: { name: 'Berlin', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: 'Oct 26, 2020 7:49:20 AM',
        up_history: 0,
        down_history: 2,
      },
    ];
    const { findAllByText } = render(<LocationStatusTags locations={monitorLocations} />);
    expect(await findAllByText('0.00 %')).toHaveLength(2);
  });
});
