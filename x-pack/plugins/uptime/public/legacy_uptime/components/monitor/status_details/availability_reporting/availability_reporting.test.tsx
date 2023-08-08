/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AvailabilityReporting } from './availability_reporting';
import { StatusTag } from './location_status_tags';
import { render } from '../../../../lib/helper/rtl_helpers';

describe('AvailabilityReporting component', () => {
  let allLocations: StatusTag[];

  beforeEach(() => {
    allLocations = [
      {
        label: 'au-heartbeat',
        timestamp: '36m ago',
        color: '#d3dae6',
        availability: 100,
        status: 'up',
      },
      {
        label: 'nyc-heartbeat',
        timestamp: '36m ago',
        color: '#d3dae6',
        availability: 100,
        status: 'down',
      },
      {
        label: 'spa-heartbeat',
        timestamp: '36m ago',
        color: '#d3dae6',
        availability: 100,
        status: 'down',
      },
    ];
  });

  it('renders correctly against snapshot', async () => {
    const { findByText } = render(<AvailabilityReporting allLocations={allLocations} />);

    expect(await findByText('This table contains 3 rows.')).toBeInTheDocument();
    expect(await findByText('au-heartbeat')).toBeInTheDocument();
  });
});
