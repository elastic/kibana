/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithIntl, shallowWithIntl } from '@kbn/test/jest';
import { AvailabilityReporting } from './availability_reporting';
import { StatusTag } from './location_status_tags';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => {
  return {
    htmlIdGenerator: () => () => `generated-id`,
  };
});

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

  it('shallow renders correctly against snapshot', () => {
    const component = shallowWithIntl(<AvailabilityReporting allLocations={allLocations} />);
    expect(component).toMatchSnapshot();
  });

  it('renders correctly against snapshot', () => {
    const component = renderWithIntl(<AvailabilityReporting allLocations={allLocations} />);
    expect(component).toMatchSnapshot();
  });
});
