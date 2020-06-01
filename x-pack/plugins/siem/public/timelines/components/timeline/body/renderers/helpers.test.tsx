/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash/fp';

import { TimelineNonEcsData } from '../../../../../graphql/types';
import { mockTimelineData } from '../../../../../common/mock';
import {
  deleteItemIdx,
  findItem,
  getValues,
  isFileEvent,
  isNillEmptyOrNotFinite,
  isProcessStoppedOrTerminationEvent,
  showVia,
} from './helpers';

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
        { field: 'destination.bytes', value: ['123456'] },
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
        { field: 'destination.bytes', value: ['123456'] },
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
        { field: 'destination.bytes', value: ['123456'] },
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
        { field: 'destination.bytes', value: ['123456'] },
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
        { field: 'destination.bytes', value: ['123456'] },
        { field: 'user.name' },
      ];
      expect(getValues('user.name', nullValue)).toBeUndefined();
    });
  });

  describe('#isNillEmptyOrNotFinite', () => {
    test('undefined returns true', () => {
      expect(isNillEmptyOrNotFinite(undefined)).toBe(true);
    });

    test('null returns true', () => {
      expect(isNillEmptyOrNotFinite(null)).toBe(true);
    });

    test('empty string returns true', () => {
      expect(isNillEmptyOrNotFinite('')).toBe(true);
    });

    test('empty array returns true', () => {
      expect(isNillEmptyOrNotFinite([])).toBe(true);
    });

    test('NaN returns true', () => {
      expect(isNillEmptyOrNotFinite(NaN)).toBe(true);
    });

    test('Infinity returns true', () => {
      expect(isNillEmptyOrNotFinite(Infinity)).toBe(true);
    });

    test('a single space string returns false', () => {
      expect(isNillEmptyOrNotFinite(' ')).toBe(false);
    });

    test('a simple string returns false', () => {
      expect(isNillEmptyOrNotFinite('a simple string')).toBe(false);
    });

    test('the number 0 returns false', () => {
      expect(isNillEmptyOrNotFinite(0)).toBe(false);
    });

    test('a non-empty array return false', () => {
      expect(isNillEmptyOrNotFinite(['non empty array'])).toBe(false);
    });
  });

  describe('#showVia', () => {
    test('undefined returns false', () => {
      expect(showVia(undefined)).toBe(false);
    });

    test('null returns false', () => {
      expect(showVia(null)).toBe(false);
    });

    test('empty string returns false', () => {
      expect(showVia('')).toBe(false);
    });

    test('a random string returns false', () => {
      expect(showVia('a random string')).toBe(false);
    });

    describe('valid values', () => {
      const validValues = ['file_create_event', 'created', 'file_delete_event', 'deleted'];

      validValues.forEach((eventAction) => {
        test(`${eventAction} returns true`, () => {
          expect(showVia(eventAction)).toBe(true);
        });
      });

      validValues.forEach((value) => {
        const upperCaseValue = value.toUpperCase();

        test(`${upperCaseValue} (upper case) returns true`, () => {
          expect(showVia(upperCaseValue)).toBe(true);
        });
      });
    });
  });

  describe('#isFileEvent', () => {
    test('returns true when both eventCategory and eventDataset are file', () => {
      expect(isFileEvent({ eventCategory: 'file', eventDataset: 'file' })).toBe(true);
    });

    test('returns false when eventCategory and eventDataset are undefined', () => {
      expect(isFileEvent({ eventCategory: undefined, eventDataset: undefined })).toBe(false);
    });

    test('returns false when eventCategory and eventDataset are null', () => {
      expect(isFileEvent({ eventCategory: null, eventDataset: null })).toBe(false);
    });

    test('returns false when eventCategory and eventDataset are random values', () => {
      expect(
        isFileEvent({ eventCategory: 'random category', eventDataset: 'random dataset' })
      ).toBe(false);
    });

    test('returns true when just eventCategory is file', () => {
      expect(isFileEvent({ eventCategory: 'file', eventDataset: undefined })).toBe(true);
    });

    test('returns true when just eventDataset is file', () => {
      expect(isFileEvent({ eventCategory: null, eventDataset: 'file' })).toBe(true);
    });

    test('returns true when just eventCategory is File with a capitol F', () => {
      expect(isFileEvent({ eventCategory: 'File', eventDataset: '' })).toBe(true);
    });

    test('returns true when just eventDataset is File with a capitol F', () => {
      expect(isFileEvent({ eventCategory: 'random', eventDataset: 'File' })).toBe(true);
    });
  });

  describe('#isProcessStoppedOrTerminationEvent', () => {
    test('returns false when eventAction is undefined', () => {
      expect(isProcessStoppedOrTerminationEvent(undefined)).toBe(false);
    });

    test('returns false when eventAction is null', () => {
      expect(isProcessStoppedOrTerminationEvent(null)).toBe(false);
    });

    test('returns false when eventAction is an empty string', () => {
      expect(isProcessStoppedOrTerminationEvent('')).toBe(false);
    });

    test('returns false when eventAction is a random value', () => {
      expect(isProcessStoppedOrTerminationEvent('a random value')).toBe(false);
    });

    describe('valid values', () => {
      const validValues = ['process_stopped', 'termination_event'];

      validValues.forEach((value) => {
        test(`returns true when eventAction is ${value}`, () => {
          expect(isProcessStoppedOrTerminationEvent(value)).toBe(true);
        });
      });

      validValues.forEach((value) => {
        const upperCaseValue = value.toUpperCase();

        test(`returns true when eventAction is (upper case) ${upperCaseValue}`, () => {
          expect(isProcessStoppedOrTerminationEvent(upperCaseValue)).toBe(true);
        });
      });
    });
  });
});
