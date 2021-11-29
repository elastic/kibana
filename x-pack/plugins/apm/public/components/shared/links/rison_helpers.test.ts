/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimepickerRisonData } from './rison_helpers';

describe('getTimepickerRisonData', () => {
  it('returns object of timepicker range and refresh interval values', async () => {
    const locationSearch = `?rangeFrom=2020-07-29T17:27:29.000Z&rangeTo=2020-07-29T18:45:00.000Z&refreshInterval=10000&refreshPaused=true`;
    const timepickerValues = getTimepickerRisonData(locationSearch);

    expect(timepickerValues).toMatchInlineSnapshot(`
      Object {
        "refreshInterval": Object {
          "pause": true,
          "value": 10000,
        },
        "time": Object {
          "from": "2020-07-29T17:27:29.000Z",
          "to": "2020-07-29T18:45:00.000Z",
        },
      }
    `);
  });
});
