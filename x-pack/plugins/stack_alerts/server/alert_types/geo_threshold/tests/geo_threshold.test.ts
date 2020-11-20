/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sampleJsonResponse from './es_sample_response.json';
import sampleJsonResponseWithNesting from './es_sample_response_with_nesting.json';
import { getMovedEntities, transformResults } from '../geo_threshold';
import { OTHER_CATEGORY } from '../es_query_builder';
import { SearchResponse } from 'elasticsearch';

describe('geo_threshold', () => {
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

  describe('getMovedEntities', () => {
    it('should return empty array if only movements were within same shapes', async () => {
      const currLocationArr = [
        {
          dateInShape: '2020-08-28T18:01:41.190Z',
          docId: 'N-ng1XQB6yyY-xQxnGSM',
          entityName: '936',
          location: [-82.8814151789993, 41.62806099653244],
          shapeLocationId: 'sameShape1',
        },
        {
          dateInShape: '2020-08-28T18:01:41.191Z',
          docId: 'iOng1XQB6yyY-xQxnGSM',
          entityName: 'AAL2019',
          location: [-82.22068064846098, 38.006176185794175],
          shapeLocationId: 'sameShape2',
        },
      ];
      const prevLocationArr = [
        {
          dateInShape: '2020-09-28T18:01:41.190Z',
          docId: 'N-ng1XQB6yyY-xQxnGSM',
          entityName: '936',
          location: [-82.8814151789993, 40.62806099653244],
          shapeLocationId: 'sameShape1',
        },
        {
          dateInShape: '2020-09-28T18:01:41.191Z',
          docId: 'iOng1XQB6yyY-xQxnGSM',
          entityName: 'AAL2019',
          location: [-82.22068064846098, 39.006176185794175],
          shapeLocationId: 'sameShape2',
        },
      ];
      const movedEntities = getMovedEntities(currLocationArr, prevLocationArr, 'entered');
      expect(movedEntities).toEqual([]);
    });

    it('should return result if entity has moved to different shape', async () => {
      const currLocationArr = [
        {
          dateInShape: '2020-09-28T18:01:41.190Z',
          docId: 'currLocationDoc1',
          entityName: '936',
          location: [-82.8814151789993, 40.62806099653244],
          shapeLocationId: 'newShapeLocation',
        },
        {
          dateInShape: '2020-09-28T18:01:41.191Z',
          docId: 'currLocationDoc2',
          entityName: 'AAL2019',
          location: [-82.22068064846098, 39.006176185794175],
          shapeLocationId: 'thisOneDidntMove',
        },
      ];
      const prevLocationArr = [
        {
          dateInShape: '2020-09-27T18:01:41.190Z',
          docId: 'prevLocationDoc1',
          entityName: '936',
          location: [-82.8814151789993, 20.62806099653244],
          shapeLocationId: 'oldShapeLocation',
        },
        {
          dateInShape: '2020-09-27T18:01:41.191Z',
          docId: 'prevLocationDoc2',
          entityName: 'AAL2019',
          location: [-82.22068064846098, 39.006176185794175],
          shapeLocationId: 'thisOneDidntMove',
        },
      ];
      const movedEntities = getMovedEntities(currLocationArr, prevLocationArr, 'entered');
      expect(movedEntities.length).toEqual(1);
    });

    it('should ignore "entered" results to "other"', async () => {
      const currLocationArr = [
        {
          dateInShape: '2020-09-28T18:01:41.190Z',
          docId: 'N-ng1XQB6yyY-xQxnGSM',
          entityName: '936',
          location: [-82.8814151789993, 41.62806099653244],
          shapeLocationId: OTHER_CATEGORY,
        },
      ];
      const prevLocationArr = [
        {
          dateInShape: '2020-08-28T18:01:41.190Z',
          docId: 'N-ng1XQB6yyY-xQxnGSM',
          entityName: '936',
          location: [-82.8814151789993, 40.62806099653244],
          shapeLocationId: 'oldShapeLocation',
        },
      ];
      const movedEntities = getMovedEntities(currLocationArr, prevLocationArr, 'entered');
      expect(movedEntities).toEqual([]);
    });

    it('should ignore "exited" results from "other"', async () => {
      const currLocationArr = [
        {
          dateInShape: '2020-09-28T18:01:41.190Z',
          docId: 'N-ng1XQB6yyY-xQxnGSM',
          entityName: '936',
          location: [-82.8814151789993, 41.62806099653244],
          shapeLocationId: 'newShapeLocation',
        },
      ];
      const prevLocationArr = [
        {
          dateInShape: '2020-08-28T18:01:41.190Z',
          docId: 'N-ng1XQB6yyY-xQxnGSM',
          entityName: '936',
          location: [-82.8814151789993, 40.62806099653244],
          shapeLocationId: OTHER_CATEGORY,
        },
      ];
      const movedEntities = getMovedEntities(currLocationArr, prevLocationArr, 'exited');
      expect(movedEntities).toEqual([]);
    });

    it('should not ignore "crossed" results from "other"', async () => {
      const currLocationArr = [
        {
          dateInShape: '2020-09-28T18:01:41.190Z',
          docId: 'N-ng1XQB6yyY-xQxnGSM',
          entityName: '936',
          location: [-82.8814151789993, 41.62806099653244],
          shapeLocationId: 'newShapeLocation',
        },
      ];
      const prevLocationArr = [
        {
          dateInShape: '2020-08-28T18:01:41.190Z',
          docId: 'N-ng1XQB6yyY-xQxnGSM',
          entityName: '936',
          location: [-82.8814151789993, 40.62806099653244],
          shapeLocationId: OTHER_CATEGORY,
        },
      ];
      const movedEntities = getMovedEntities(currLocationArr, prevLocationArr, 'crossed');
      expect(movedEntities.length).toEqual(1);
    });

    it('should not ignore "crossed" results to "other"', async () => {
      const currLocationArr = [
        {
          dateInShape: '2020-08-28T18:01:41.190Z',
          docId: 'N-ng1XQB6yyY-xQxnGSM',
          entityName: '936',
          location: [-82.8814151789993, 40.62806099653244],
          shapeLocationId: OTHER_CATEGORY,
        },
      ];
      const prevLocationArr = [
        {
          dateInShape: '2020-09-28T18:01:41.190Z',
          docId: 'N-ng1XQB6yyY-xQxnGSM',
          entityName: '936',
          location: [-82.8814151789993, 41.62806099653244],
          shapeLocationId: 'newShapeLocation',
        },
      ];
      const movedEntities = getMovedEntities(currLocationArr, prevLocationArr, 'crossed');
      expect(movedEntities.length).toEqual(1);
    });
  });
});
