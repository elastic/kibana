/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Datatable, ExpressionFunctionDefinition } from '../../../types';

interface Return extends Datatable {
  columns: [
    { id: 'latitude'; name: 'latitude'; meta: { type: 'number' } },
    { id: 'longitude'; name: 'longitude'; meta: { type: 'number' } }
  ];
  rows: [{ latitude: number; longitude: number }];
}

const help = i18n.translate('xpack.canvas.functions.locationHelpText', {
  defaultMessage:
    'Find your current location using the {geolocationAPI} of the browser. ' +
    'Performance can vary, but is fairly accurate. ' +
    'See {url}. Don’t use {locationFn} if you plan to generate PDFs as this function requires user input.',
  values: {
    geolocationAPI: 'Geolocation API',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/Navigator/geolocation',
    locationFn: '`location`',
  },
});

export function location(): ExpressionFunctionDefinition<'location', null, {}, Promise<Return>> {
  return {
    name: 'location',
    type: 'datatable',
    inputTypes: ['null'],
    args: {},
    help,
    fn: async (input, args, context) => {
      const { locationFn } = await import('./fns');
      return await locationFn(input, args, context);
    },
  };
}
