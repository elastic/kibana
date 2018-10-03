/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

const noop = () => {};

export const location = () => ({
  name: 'location',
  type: 'datatable',
  context: {
    types: ['null'],
  },
  help: i18n.translate('xpack.canvas.functions.locationHelpText', {
    defaultMessage:
      "Use the browser's location functionality to get your current location. Usually quite slow, but fairly accurate",
  }),
  fn: () => {
    return new Promise(resolve => {
      function createLocation(geoposition) {
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
});
