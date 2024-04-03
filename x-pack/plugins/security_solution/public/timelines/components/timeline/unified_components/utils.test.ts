/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';

import { mockSourcererScope } from '../../../../common/containers/sourcerer/mocks';
import { mockTimelineData } from '../../../../common/mock';
import { transformTimelineItemToUnifiedRows } from './utils';

const testTimelineData = mockTimelineData;

describe('utils', () => {
  describe('transformTimelineItemToUnifiedRows', () => {
    it('should return correct result', () => {
      const result = transformTimelineItemToUnifiedRows({
        events: testTimelineData,
        dataView: new DataView({
          spec: mockSourcererScope.sourcererDataView,
          fieldFormats: fieldFormatsMock,
        }),
      });

      expect(result[0]).toEqual({
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
  });
});
