/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';

import { mockSourcererScope } from '../../../../sourcerer/containers/mocks';
import { mockTimelineData } from '../../../../common/mock';
import type { TransformTimelineItemToUnifiedRowsReturn } from './utils';
import { transformTimelineItemToUnifiedRows } from './utils';

const testTimelineData = mockTimelineData;

describe('utils', () => {
  describe('transformTimelineItemToUnifiedRows', () => {
    let result: TransformTimelineItemToUnifiedRowsReturn;
    beforeAll(() => {
      result = transformTimelineItemToUnifiedRows({
        events: testTimelineData,
        dataView: new DataView({
          spec: mockSourcererScope.sourcererDataView,
          fieldFormats: fieldFormatsMock,
        }),
      });
    });

    it('should return correct result', () => {
      const { tableRows } = result;
      expect(tableRows[0]).toEqual({
        _id: testTimelineData[0]._id,
        id: testTimelineData[0]._id,
        data: testTimelineData[0].data,
        ecs: testTimelineData[0].ecs,
        raw: {
          _id: testTimelineData[0]._id,
          _index: String(testTimelineData[0]._index),
          _source: testTimelineData[0].ecs,
        },
        flattened: {
          _id: testTimelineData[0]._id,
          timestamp: '2018-11-05T19:03:25.937Z',
          'host.name': ['apache'],
          'host.ip': ['192.168.0.1'],
          'event.id': ['1'],
          'event.kind': ['signal'],
          'event.action': ['Action'],
          'event.category': ['Access'],
          'event.module': ['nginx'],
          'event.severity': [3],
          'source.ip': ['192.168.0.1'],
          'source.port': [80],
          'destination.ip': ['192.168.0.3'],
          'destination.port': [6343],
          'user.id': ['1'],
          'user.name': ['john.dee'],
          'geo.region_name': ['xx'],
          'geo.country_iso_code': ['xx'],
        },
      });
    });

    it('should return correct table styles', () => {
      const { tableStylesOverride } = result;
      expect(tableStylesOverride).toMatchInlineSnapshot(`
        Object {
          "border": "horizontal",
          "cellPadding": "l",
          "fontSize": "s",
          "header": "underline",
          "rowClasses": Object {
            "0": "rawEvent",
            "1": "rawEvent",
            "10": "rawEvent",
            "11": "rawEvent",
            "12": "rawEvent",
            "13": "rawEvent",
            "14": "rawEvent",
            "15": "rawEvent",
            "16": "rawEvent",
            "17": "rawEvent",
            "18": "rawEvent",
            "19": "rawEvent",
            "2": "rawEvent",
            "20": "rawEvent",
            "21": "rawEvent",
            "22": "rawEvent",
            "23": "rawEvent",
            "24": "rawEvent",
            "25": "rawEvent",
            "26": "rawEvent",
            "27": "rawEvent",
            "28": "rawEvent",
            "29": "rawEvent",
            "3": "rawEvent",
            "30": "rawEvent",
            "31": "rawEvent",
            "4": "rawEvent",
            "5": "rawEvent",
            "6": "rawEvent",
            "7": "rawEvent",
            "8": "rawEvent",
            "9": "rawEvent",
          },
          "rowHover": "highlight",
          "stripes": true,
        }
      `);
    });
  });
});
