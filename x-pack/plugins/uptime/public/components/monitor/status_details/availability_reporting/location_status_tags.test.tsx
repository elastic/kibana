/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithIntl, shallowWithIntl } from '@kbn/test/jest';
import { MonitorLocation } from '../../../../../common/runtime_types/monitor';
import { LocationStatusTags } from './index';
import { mockMoment } from '../../../../lib/helper/test_helpers';

mockMoment();

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => {
  return {
    htmlIdGenerator: () => () => `generated-id`,
  };
});

describe('LocationStatusTags component', () => {
  let monitorLocations: MonitorLocation[];

  it('renders properly against props', () => {
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
      {
        summary: { up: 0, down: 2 },
        geo: { name: 'Berlin', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: 'Oct 26, 2020 7:49:20 AM',
        up_history: 4,
        down_history: 0,
      },
    ];
    const component = shallowWithIntl(<LocationStatusTags locations={monitorLocations} />);
    expect(component).toMatchSnapshot();
  });

  it('renders when there are many location', () => {
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
        down_history: 0,
      },
      {
        summary: { up: 0, down: 1 },
        geo: { name: 'st-paul', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: 'Oct 26, 2020 7:49:20 AM',
        up_history: 4,
        down_history: 0,
      },
      {
        summary: { up: 0, down: 1 },
        geo: { name: 'Tokyo', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: 'Oct 26, 2020 7:49:20 AM',
        up_history: 4,
        down_history: 0,
      },
      {
        summary: { up: 0, down: 1 },
        geo: { name: 'New York', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: 'Oct 26, 2020 7:49:20 AM',
        up_history: 4,
        down_history: 0,
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
    const component = renderWithIntl(<LocationStatusTags locations={monitorLocations} />);
    expect(component).toMatchSnapshot();
  });

  it('renders when all locations are up', () => {
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
    const component = renderWithIntl(<LocationStatusTags locations={monitorLocations} />);
    expect(component).toMatchSnapshot();
  });

  it('renders when all locations are down', () => {
    monitorLocations = [
      {
        summary: { up: 0, down: 2 },
        geo: { name: 'Islamabad', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: 'Oct 26, 2020 7:49:20 AM',
        up_history: 4,
        down_history: 0,
      },
      {
        summary: { up: 0, down: 2 },
        geo: { name: 'Berlin', location: { lat: '52.487448', lon: ' 13.394798' } },
        timestamp: 'Oct 26, 2020 7:49:20 AM',
        up_history: 4,
        down_history: 0,
      },
    ];
    const component = renderWithIntl(<LocationStatusTags locations={monitorLocations} />);
    expect(component).toMatchSnapshot();
  });
});
