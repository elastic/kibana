/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sampleJsonResponse from './es_sample_response.json';
import sampleJsonResponseWithNesting from './es_sample_response_with_nesting.json';
import { transformResults } from '../geo_containment';
import { SearchResponse } from 'elasticsearch';

describe('geo_containment', () => {
  describe('transformResults', () => {
    const dateField = '@timestamp';
    const geoField = 'location';
    it('should correctly transform expected results', async () => {
      const transformedResults = transformResults(
        (sampleJsonResponse as unknown) as SearchResponse<unknown>,
        dateField,
        geoField
      );
      expect(transformedResults).toEqual([
        {
          dateInShape: '2020-09-28T18:01:41.190Z',
          docId: 'N-ng1XQB6yyY-xQxnGSM',
          entityName: '936',
          location: [-82.8814151789993, 40.62806099653244],
          shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
        },
        {
          dateInShape: '2020-09-28T18:01:41.191Z',
          docId: 'iOng1XQB6yyY-xQxnGSM',
          entityName: 'AAL2019',
          location: [-82.22068064846098, 39.006176185794175],
          shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
        },
        {
          dateInShape: '2020-09-28T18:01:41.191Z',
          docId: 'n-ng1XQB6yyY-xQxnGSM',
          entityName: 'AAL2323',
          location: [-84.71324851736426, 41.6677269525826],
          shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
        },
        {
          dateInShape: '2020-09-28T18:01:41.192Z',
          docId: 'GOng1XQB6yyY-xQxnGWM',
          entityName: 'ABD5250',
          location: [6.073727197945118, 39.07997465226799],
          shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
        },
      ]);
    });

    const nestedDateField = 'time_data.@timestamp';
    const nestedGeoField = 'geo.coords.location';
    it('should correctly transform expected results if fields are nested', async () => {
      const transformedResults = transformResults(
        (sampleJsonResponseWithNesting as unknown) as SearchResponse<unknown>,
        nestedDateField,
        nestedGeoField
      );
      expect(transformedResults).toEqual([
        {
          dateInShape: '2020-09-28T18:01:41.190Z',
          docId: 'N-ng1XQB6yyY-xQxnGSM',
          entityName: '936',
          location: [-82.8814151789993, 40.62806099653244],
          shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
        },
        {
          dateInShape: '2020-09-28T18:01:41.191Z',
          docId: 'iOng1XQB6yyY-xQxnGSM',
          entityName: 'AAL2019',
          location: [-82.22068064846098, 39.006176185794175],
          shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
        },
        {
          dateInShape: '2020-09-28T18:01:41.191Z',
          docId: 'n-ng1XQB6yyY-xQxnGSM',
          entityName: 'AAL2323',
          location: [-84.71324851736426, 41.6677269525826],
          shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
        },
        {
          dateInShape: '2020-09-28T18:01:41.192Z',
          docId: 'GOng1XQB6yyY-xQxnGWM',
          entityName: 'ABD5250',
          location: [6.073727197945118, 39.07997465226799],
          shapeLocationId: '0DrJu3QB6yyY-xQxv6Ip',
        },
      ]);
    });

    it('should return an empty array if no results', async () => {
      const transformedResults = transformResults(undefined, dateField, geoField);
      expect(transformedResults).toEqual([]);
    });
  });
});
