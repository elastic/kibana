/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { MonitorLocation } from '../../../../../common/runtime_types';
import { StatusByLocations } from '../index';

describe('StatusByLocation component', () => {
  let monitorLocations: MonitorLocation[];

  it('renders properly against props', () => {
    monitorLocations = [
      {
        summary: { up: 4, down: 0 },
        geo: { name: 'Berlin', location: { lat: '52.487448', lon: ' 13.394798' } },
        up_history: 4,
        down_history: 0,
        timestamp: '2020-01-13T22:50:06.536Z',
      },
      {
        summary: { up: 4, down: 0 },
        geo: { name: 'st-paul', location: { lat: '52.487448', lon: ' 13.394798' } },
        up_history: 4,
        down_history: 0,
        timestamp: '2020-01-13T22:50:06.536Z',
      },
    ];
    const component = shallowWithIntl(<StatusByLocations locations={monitorLocations} />);
    expect(component).toMatchSnapshot();
  });

  it('renders when up in all locations', () => {
    monitorLocations = [
      {
        summary: { up: 4, down: 0 },
        geo: { name: 'Berlin', location: { lat: '52.487448', lon: ' 13.394798' } },
        up_history: 4,
        down_history: 0,
        timestamp: '2020-01-13T22:50:06.536Z',
      },
      {
        summary: { up: 4, down: 0 },
        geo: { name: 'st-paul', location: { lat: '52.487448', lon: ' 13.394798' } },
        up_history: 4,
        down_history: 0,
        timestamp: '2020-01-13T22:50:06.536Z',
      },
    ];
    const component = renderWithIntl(<StatusByLocations locations={monitorLocations} />);
    expect(component).toMatchSnapshot();
  });

  it('renders when only one location and it is up', () => {
    monitorLocations = [
      {
        summary: { up: 4, down: 0 },
        geo: { name: 'Berlin', location: { lat: '52.487448', lon: ' 13.394798' } },
        up_history: 4,
        down_history: 0,
        timestamp: '2020-01-13T22:50:06.536Z',
      },
    ];
    const component = renderWithIntl(<StatusByLocations locations={monitorLocations} />);
    expect(component).toMatchSnapshot();
  });

  it('renders when only one location and it is down', () => {
    monitorLocations = [
      {
        summary: { up: 0, down: 4 },
        geo: { name: 'Berlin', location: { lat: '52.487448', lon: ' 13.394798' } },
        up_history: 4,
        down_history: 0,
        timestamp: '2020-01-13T22:50:06.536Z',
      },
    ];
    const component = renderWithIntl(<StatusByLocations locations={monitorLocations} />);
    expect(component).toMatchSnapshot();
  });

  it('renders all locations are down', () => {
    monitorLocations = [
      {
        summary: { up: 0, down: 4 },
        geo: { name: 'Berlin', location: { lat: '52.487448', lon: ' 13.394798' } },
        up_history: 4,
        down_history: 0,
        timestamp: '2020-01-13T22:50:06.536Z',
      },
      {
        summary: { up: 0, down: 4 },
        geo: { name: 'st-paul', location: { lat: '52.487448', lon: ' 13.394798' } },
        up_history: 4,
        down_history: 0,
        timestamp: '2020-01-13T22:50:06.536Z',
      },
    ];
    const component = renderWithIntl(<StatusByLocations locations={monitorLocations} />);
    expect(component).toMatchSnapshot();
  });

  it('renders when down in some locations', () => {
    monitorLocations = [
      {
        summary: { up: 0, down: 4 },
        geo: { name: 'Berlin', location: { lat: '52.487448', lon: ' 13.394798' } },
        up_history: 4,
        down_history: 0,
        timestamp: '2020-01-13T22:50:06.536Z',
      },
      {
        summary: { up: 4, down: 0 },
        geo: { name: 'st-paul', location: { lat: '52.487448', lon: ' 13.394798' } },
        up_history: 4,
        down_history: 0,
        timestamp: '2020-01-13T22:50:06.536Z',
      },
    ];
    const component = renderWithIntl(<StatusByLocations locations={monitorLocations} />);
    expect(component).toMatchSnapshot();
  });
});
