/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NullContextFunction } from '../types';

const noop = () => {};

export function location(): NullContextFunction<'location', {}, void> {
  return {
    name: 'location',
    type: 'datatable',
    context: {
      types: ['null'],
    },
    args: {},
    help:
      "Use the browser's location functionality to get your current location. Usually quite slow, but fairly accurate",
    fn: () => {
      return new Promise(resolve => {
        function createLocation(geoposition: Position) {
          const { latitude, longitude } = geoposition.coords;
          return resolve({
            type: 'datatable',
            columns: [{ name: 'latitude', type: 'number' }, { name: 'longitude', type: 'number' }],
            rows: [{ latitude, longitude }],
          });
        }
        return navigator.geolocation.getCurrentPosition(createLocation, noop, {
          maximumAge: 5000,
        });
      });
    },
  };
}
