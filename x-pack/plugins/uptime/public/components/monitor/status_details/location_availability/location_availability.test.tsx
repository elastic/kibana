/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../../../../lib/helper/rtl_helpers';
import { LocationAvailability } from './location_availability';
import { MonitorLocations } from '../../../../../common/runtime_types';

// Note For shallow test, we need absolute time strings
describe('LocationAvailability component', () => {
  let monitorLocations: MonitorLocations;

  beforeEach(() => {
    monitorLocations = {
      monitorId: 'wapo',
      up_history: 12,
      down_history: 0,
      locations: [
        {
          summary: { up: 4, down: 0 },
          geo: { name: 'New York', location: { lat: '40.730610', lon: ' -73.935242' } },
          timestamp: '2020-01-13T22:50:06.536Z',
          up_history: 4,
          down_history: 0,
        },
        {
          summary: { up: 2, down: 2 },
          geo: { name: 'Tokyo', location: { lat: '52.487448', lon: ' 13.394798' } },
          timestamp: '2020-01-13T22:50:04.354Z',
          up_history: 2,
          down_history: 2,
        },
        {
          summary: { up: 0, down: 4 },
          geo: { name: 'Unnamed-location' },
          timestamp: '2020-01-13T22:50:02.753Z',
          up_history: 0,
          down_history: 4,
        },
      ],
    };
  });

  it('renders correctly', () => {
    render(<LocationAvailability monitorLocations={monitorLocations} />);
    expect(screen.getByRole('heading', { name: 'Monitoring from', level: 3 }));
    expect(screen.getByText('New York')).toBeInTheDocument();
    expect(screen.getByText('Tokyo')).toBeInTheDocument();
    expect(screen.getByText('Unnamed-location')).toBeInTheDocument();
    expect(screen.getByText('100.00 %')).toBeInTheDocument();
    expect(screen.getByText('50.00 %')).toBeInTheDocument();
    expect(screen.getByText('0.00 %')).toBeInTheDocument();
    expect(screen.getByText('Jan 13, 2020 5:50:06 PM')).toBeInTheDocument();
    expect(screen.getByText('Jan 13, 2020 5:50:04 PM')).toBeInTheDocument();
    expect(screen.getByText('Jan 13, 2020 5:50:02 PM')).toBeInTheDocument();
  });
});
