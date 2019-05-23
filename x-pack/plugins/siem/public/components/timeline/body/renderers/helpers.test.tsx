/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash/fp';

import { TimelineNonEcsData } from '../../../../graphql/types';
import { mockTimelineData } from '../../../../mock';
import { deleteItemIdx, findItem, getValues } from './helpers';

describe('helpers', () => {
  describe('#deleteItemIdx', () => {
    let mockDatum: TimelineNonEcsData[];
    beforeEach(() => {
      mockDatum = cloneDeep(mockTimelineData[0].data);
    });

    test('should delete part of a value value', () => {
      const deleted = deleteItemIdx(mockDatum, 1);
      const expected: TimelineNonEcsData[] = [
        { field: '@timestamp', value: ['2018-11-05T19:03:25.937Z'] },
        // { field: 'event.category', value: ['Access'] <-- deleted entry
        { field: 'event.category', value: ['Access'] },
        { field: 'event.action', value: ['Action'] },
        { field: 'host.name', value: ['apache'] },
        { field: 'source.ip', value: ['192.168.0.1'] },
        { field: 'destination.ip', value: ['192.168.0.3'] },
        { field: 'user.name', value: ['john.dee'] },
      ];
      expect(deleted).toEqual(expected);
    });

    test('should not delete any part of the value, when the value when out of bounds', () => {
      const deleted = deleteItemIdx(mockDatum, 1000);
      const expected: TimelineNonEcsData[] = [
        { field: '@timestamp', value: ['2018-11-05T19:03:25.937Z'] },
        { field: 'event.severity', value: ['3'] },
        { field: 'event.category', value: ['Access'] },
        { field: 'event.action', value: ['Action'] },
        { field: 'host.name', value: ['apache'] },
        { field: 'source.ip', value: ['192.168.0.1'] },
        { field: 'destination.ip', value: ['192.168.0.3'] },
        { field: 'user.name', value: ['john.dee'] },
      ];
      expect(deleted).toEqual(expected);
    });
  });

  describe('#findItem', () => {
    let mockDatum: TimelineNonEcsData[];
    beforeEach(() => {
      mockDatum = cloneDeep(mockTimelineData[0].data);
    });
    test('should find an index with non-zero', () => {
      expect(findItem(mockDatum, 'event.severity')).toEqual(1);
    });

    test('should return -1 with a field not found', () => {
      expect(findItem(mockDatum, 'event.made-up')).toEqual(-1);
    });
  });

  describe('#getValues', () => {
    let mockDatum: TimelineNonEcsData[];
    beforeEach(() => {
      mockDatum = cloneDeep(mockTimelineData[0].data);
    });

    test('should return a valid value', () => {
      expect(getValues('event.severity', mockDatum)).toEqual(['3']);
    });

    test('should return undefined when the value is not found', () => {
      expect(getValues('event.made-up-value', mockDatum)).toBeUndefined();
    });

    test('should return an undefined when the value found is null', () => {
      const nullValue: TimelineNonEcsData[] = [
        { field: '@timestamp', value: ['2018-11-05T19:03:25.937Z'] },
        { field: 'event.severity', value: ['3'] },
        { field: 'event.category', value: ['Access'] },
        { field: 'event.action', value: ['Action'] },
        { field: 'host.name', value: ['apache'] },
        { field: 'source.ip', value: ['192.168.0.1'] },
        { field: 'destination.ip', value: ['192.168.0.3'] },
        { field: 'user.name', value: null },
      ];
      expect(getValues('user.name', nullValue)).toBeUndefined();
    });

    test('should return an undefined when the value found is undefined', () => {
      const nullValue: TimelineNonEcsData[] = [
        { field: '@timestamp', value: ['2018-11-05T19:03:25.937Z'] },
        { field: 'event.severity', value: ['3'] },
        { field: 'event.category', value: ['Access'] },
        { field: 'event.action', value: ['Action'] },
        { field: 'host.name', value: ['apache'] },
        { field: 'source.ip', value: ['192.168.0.1'] },
        { field: 'destination.ip', value: ['192.168.0.3'] },
        { field: 'user.name', value: undefined },
      ];
      expect(getValues('user.name', nullValue)).toBeUndefined();
    });

    test('should return an undefined when the value is not present', () => {
      const nullValue: TimelineNonEcsData[] = [
        { field: '@timestamp', value: ['2018-11-05T19:03:25.937Z'] },
        { field: 'event.severity', value: ['3'] },
        { field: 'event.category', value: ['Access'] },
        { field: 'event.action', value: ['Action'] },
        { field: 'host.name', value: ['apache'] },
        { field: 'source.ip', value: ['192.168.0.1'] },
        { field: 'destination.ip', value: ['192.168.0.3'] },
        { field: 'user.name' },
      ];
      expect(getValues('user.name', nullValue)).toBeUndefined();
    });
  });
});
