/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sampleAggsJsonResponse from '../tests/es_sample_response.json';
import sampleAggsJsonResponseWithNesting from '../tests/es_sample_response_with_nesting.json';
import { transformResults } from './transform_results';

describe('transformResults', () => {
  const dateField = '@timestamp';
  const geoField = 'location';
  test('should correctly transform expected results', async () => {
    const transformedResults = transformResults(
      // @ts-ignore
      sampleAggsJsonResponse.body,
      dateField,
      geoField
    );
    expect(transformedResults).toEqual(
      new Map([
        [
          '0',
          [
            {
              dateInShape: '2021-04-28T16:56:11.923Z',
              docId: 'ZVBoGXkBsFLYN2Tj1wmV',
              location: [-73.99018926545978, 40.751759740523994],
              shapeLocationId: 'kFATGXkBsFLYN2Tj6AAk',
            },
            {
              dateInShape: '2021-04-28T16:56:01.896Z',
              docId: 'YlBoGXkBsFLYN2TjsAlp',
              location: [-73.98968475870788, 40.7506317878142],
              shapeLocationId: 'other',
            },
          ],
        ],
        [
          '1',
          [
            {
              dateInShape: '2021-04-28T16:56:11.923Z',
              docId: 'ZlBoGXkBsFLYN2Tj1wmV',
              location: [-73.99561604484916, 40.75449890457094],
              shapeLocationId: 'kFATGXkBsFLYN2Tj6AAk',
            },
            {
              dateInShape: '2021-04-28T16:56:01.896Z',
              docId: 'Y1BoGXkBsFLYN2TjsAlp',
              location: [-73.99459345266223, 40.755913141183555],
              shapeLocationId: 'other',
            },
          ],
        ],
        [
          '2',
          [
            {
              dateInShape: '2021-04-28T16:56:11.923Z',
              docId: 'Z1BoGXkBsFLYN2Tj1wmV',
              location: [-73.98662586696446, 40.7667087810114],
              shapeLocationId: 'other',
            },
          ],
        ],
      ])
    );
  });

  const nestedDateField = 'time_data.@timestamp';
  const nestedGeoField = 'geo.coords.location';
  test('should correctly transform expected results if fields are nested', async () => {
    const transformedResults = transformResults(
      // @ts-ignore
      sampleAggsJsonResponseWithNesting.body,
      nestedDateField,
      nestedGeoField
    );
    expect(transformedResults).toEqual(
      new Map([
        [
          '936',
          [
            {
              dateInShape: '2020-09-28T18:01:41.190Z',
              docId: 'N-ng1XQB6yyY-xQxnGSM',
              location: [-82.8814151789993, 40.62806099653244],
              shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
            },
          ],
        ],
        [
          'AAL2019',
          [
            {
              dateInShape: '2020-09-28T18:01:41.191Z',
              docId: 'iOng1XQB6yyY-xQxnGSM',
              location: [-82.22068064846098, 39.006176185794175],
              shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
            },
          ],
        ],
        [
          'AAL2323',
          [
            {
              dateInShape: '2020-09-28T18:01:41.191Z',
              docId: 'n-ng1XQB6yyY-xQxnGSM',
              location: [-84.71324851736426, 41.6677269525826],
              shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
            },
          ],
        ],
        [
          'ABD5250',
          [
            {
              dateInShape: '2020-09-28T18:01:41.192Z',
              docId: 'GOng1XQB6yyY-xQxnGWM',
              location: [6.073727197945118, 39.07997465226799],
              shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
            },
          ],
        ],
      ])
    );
  });
});
