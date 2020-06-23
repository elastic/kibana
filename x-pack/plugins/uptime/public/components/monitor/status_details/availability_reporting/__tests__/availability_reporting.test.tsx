/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { AvailabilityReporting } from '../availability_reporting';
import { StatusTag } from '../location_status_tags';

describe('AvailabilityReporting component', () => {
  let allLocations: StatusTag[];

  beforeEach(() => {
    allLocations = [
      {
        label: 'au-heartbeat',
        timestamp: '36m ago',
        color: '#d3dae6',
        availability: 100,
      },
      {
        label: 'nyc-heartbeat',
        timestamp: '36m ago',
        color: '#d3dae6',
        availability: 100,
      },
      { label: 'spa-heartbeat', timestamp: '36m ago', color: '#d3dae6', availability: 100 },
    ];
  });

  it('shallow renders correctly against snapshot', () => {
    const component = shallowWithIntl(<AvailabilityReporting allLocations={allLocations} />);
    expect(component).toMatchSnapshot();
  });

  it('renders correctly against snapshot', () => {
    const component = renderWithIntl(<AvailabilityReporting allLocations={allLocations} />);
    expect(component).toMatchSnapshot();
  });
});
