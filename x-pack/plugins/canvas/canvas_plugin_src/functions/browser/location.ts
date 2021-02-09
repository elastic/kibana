/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datatable, ExpressionFunctionDefinition } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

const noop = () => {};

interface Return extends Datatable {
  columns: [
    { id: 'latitude'; name: 'latitude'; meta: { type: 'number' } },
    { id: 'longitude'; name: 'longitude'; meta: { type: 'number' } }
  ];
  rows: [{ latitude: number; longitude: number }];
}

export function location(): ExpressionFunctionDefinition<'location', null, {}, Promise<Return>> {
  const { help } = getFunctionHelp().location;

  return {
    name: 'location',
    type: 'datatable',
    inputTypes: ['null'],
    args: {},
    help,
    fn: () => {
      return new Promise((resolve) => {
        function createLocation(geoposition: GeolocationPosition) {
          const { latitude, longitude } = geoposition.coords;
          return resolve({
            type: 'datatable',
            columns: [
              { id: 'latitude', name: 'latitude', meta: { type: 'number' } },
              { id: 'longitude', name: 'longitude', meta: { type: 'number' } },
            ],
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
