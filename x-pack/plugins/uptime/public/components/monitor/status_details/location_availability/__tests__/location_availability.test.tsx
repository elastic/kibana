/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test/jest';
import { LocationAvailability } from '../location_availability';
import { MonitorLocations } from '../../../../../../common/runtime_types';
import { LocationMissingWarning } from '../../location_map/location_missing';

class LocalStorageMock {
  store: Record<string, string>;
  constructor() {
    this.store = { 'xpack.uptime.detailPage.selectedView': 'list' };
  }

  clear() {
    this.store = {};
  }

  getItem(key: string) {
    return this.store[key] || null;
  }

  setItem(key: string, value: string) {
    this.store[key] = value.toString();
  }

  removeItem(key: string) {
    delete this.store[key];
  }
}

// Note For shallow test, we need absolute time strings
describe('LocationAvailability component', () => {
  let monitorLocations: MonitorLocations;

  beforeEach(() => {
    // @ts-ignore replacing a call to localStorage we use for monitor list size
    global.localStorage = new LocalStorageMock();

    // @ts-ignore replacing a call to localStorage we use for monitor list size
    global.localStorage.setItem('xpack.uptime.detailPage.selectedView', 'list');

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
          summary: { up: 4, down: 0 },
          geo: { name: 'Tokyo', location: { lat: '52.487448', lon: ' 13.394798' } },
          timestamp: '2020-01-13T22:50:04.354Z',
          up_history: 4,
          down_history: 0,
        },
        {
          summary: { up: 4, down: 0 },
          geo: { name: 'Unnamed-location' },
          timestamp: '2020-01-13T22:50:02.753Z',
          up_history: 4,
          down_history: 0,
        },
      ],
    };
  });

  it('renders correctly against snapshot', () => {
    const component = shallowWithIntl(<LocationAvailability monitorLocations={monitorLocations} />);
    expect(component).toMatchSnapshot();
  });

  it('shows warning if geo information is missing', () => {
    // @ts-ignore replacing a call to localStorage we use for monitor list size
    global.localStorage.setItem('xpack.uptime.detailPage.selectedView', 'map');

    monitorLocations = {
      monitorId: 'wapo',
      up_history: 8,
      down_history: 0,
      locations: [
        {
          summary: { up: 4, down: 0 },
          geo: { name: 'Tokyo', location: { lat: '52.487448', lon: ' 13.394798' } },
          timestamp: '2020-01-13T22:50:04.354Z',
          up_history: 4,
          down_history: 0,
        },
        {
          summary: { up: 4, down: 0 },
          geo: { name: 'Unnamed-location' },
          timestamp: '2020-01-13T22:50:02.753Z',
          up_history: 4,
          down_history: 0,
        },
      ],
    };
    const component = shallowWithIntl(<LocationAvailability monitorLocations={monitorLocations} />);
    expect(component).toMatchSnapshot();

    const warningComponent = component.find(LocationMissingWarning);
    expect(warningComponent).toHaveLength(1);
  });

  it('doesnt shows warning if geo is provided', () => {
    monitorLocations = {
      monitorId: 'wapo',
      up_history: 8,
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
          summary: { up: 4, down: 0 },
          geo: { name: 'Tokyo', location: { lat: '52.487448', lon: ' 13.394798' } },
          timestamp: '2020-01-13T22:50:04.354Z',
          up_history: 4,
          down_history: 0,
        },
      ],
    };
    const component = shallowWithIntl(<LocationAvailability monitorLocations={monitorLocations} />);
    expect(component).toMatchSnapshot();

    const warningComponent = component.find(LocationMissingWarning);
    expect(warningComponent).toHaveLength(0);
  });

  it('renders named locations that have missing geo data', () => {
    monitorLocations = {
      monitorId: 'wapo',
      up_history: 4,
      down_history: 0,
      locations: [
        {
          summary: { up: 4, down: 0 },
          geo: { name: 'New York', location: undefined },
          timestamp: '2020-01-13T22:50:06.536Z',
          up_history: 4,
          down_history: 0,
        },
      ],
    };

    const component = shallowWithIntl(<LocationAvailability monitorLocations={monitorLocations} />);
    expect(component).toMatchSnapshot();
  });
});
