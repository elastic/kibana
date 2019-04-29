/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { getRollupSearchCapabilities } from './rollup_search_capabilities';

class DefaultSearchCapabilities {
  constructor(request, batchRequestsSupport, fieldsCapabilities = {}) {
    this.fieldsCapabilities = fieldsCapabilities;
    this.parseInterval = jest.fn((interval) => interval);
  }
}

describe('Rollup Search Capabilities', () => {
  const testTimeZone = 'time_zone';
  const testInterval = '10s';
  const rollupIndex = 'rollupIndex';
  const batchRequestsSupport = true;
  const request = {};

  let RollupSearchCapabilities;
  let fieldsCapabilities;
  let rollupSearchCaps;

  beforeEach(() => {
    RollupSearchCapabilities = getRollupSearchCapabilities(DefaultSearchCapabilities);
    fieldsCapabilities = {
      [rollupIndex]: {
        aggs: {
          date_histogram: {
            histogram_field: {
              time_zone: testTimeZone,
              interval: testInterval,
            },
          },
        },
      },
    };

    rollupSearchCaps = new RollupSearchCapabilities(request, batchRequestsSupport, fieldsCapabilities, rollupIndex);
  });

  test('should create instance of RollupSearchRequest', () => {
    expect(rollupSearchCaps).toBeInstanceOf(DefaultSearchCapabilities);
    expect(rollupSearchCaps.fieldsCapabilities).toBe(fieldsCapabilities);
    expect(rollupSearchCaps.rollupIndex).toBe(rollupIndex);
  });

  test('should return the "timezone" for the rollup request', () => {
    expect(rollupSearchCaps.searchTimezone).toBe(testTimeZone);
  });

  test('should return the default "interval" for the rollup request', () => {
    expect(rollupSearchCaps.defaultTimeInterval).toBe(testInterval);
  });

  describe('getValidTimeInterval', () => {
    let parsedDefaultInterval;
    let parsedUserIntervalString;
    let convertedIntervalIntoDefaultUnit;

    beforeEach(() => {
      convertedIntervalIntoDefaultUnit = null;

      rollupSearchCaps.parseInterval = jest.fn()
        .mockImplementationOnce(() => parsedDefaultInterval)
        .mockImplementationOnce(() => parsedUserIntervalString);
      rollupSearchCaps.convertIntervalToUnit = jest
        .fn(() => convertedIntervalIntoDefaultUnit || parsedUserIntervalString);
    });

    test('should return 1w as common interval for 1w(user interval) and 1d(rollup interval) - calendar intervals', () => {
      parsedDefaultInterval = {
        value: 1,
        unit: 'd',
      };
      parsedUserIntervalString = {
        value: 1,
        unit: 'w',
      };
      convertedIntervalIntoDefaultUnit = {
        value: 7,
        unit: 'd',
      };

      expect(rollupSearchCaps.getValidTimeInterval()).toBe('1w');
    });

    test('should return 1w as common interval for 1d(user interval) and 1w(rollup interval) - calendar intervals', () => {
      parsedDefaultInterval = {
        value: 1,
        unit: 'w',
      };
      parsedUserIntervalString = {
        value: 1,
        unit: 'd',
      };
      convertedIntervalIntoDefaultUnit = {
        value: 1 / 7,
        unit: 'w',
      };

      expect(rollupSearchCaps.getValidTimeInterval()).toBe('1w');
    });

    test('should return 2y as common interval for 0.1y(user interval) and 2y(rollup interval) - fixed intervals', () => {
      parsedDefaultInterval = {
        value: 2,
        unit: 'y',
      };
      parsedUserIntervalString = {
        value: 0.1,
        unit: 'y',
      };

      expect(rollupSearchCaps.getValidTimeInterval()).toBe('2y');
    });

    test('should return 3h as common interval for 2h(user interval) and 3h(rollup interval) - fixed intervals', () => {
      parsedDefaultInterval = {
        value: 3,
        unit: 'h',
      };
      parsedUserIntervalString = {
        value: 2,
        unit: 'h',
      };

      expect(rollupSearchCaps.getValidTimeInterval()).toBe('3h');
    });

    test('should return 6m as common interval for 4m(user interval) and 3m(rollup interval) - fixed intervals', () => {
      parsedDefaultInterval = {
        value: 3,
        unit: 'm',
      };
      parsedUserIntervalString = {
        value: 4,
        unit: 'm',
      };

      expect(rollupSearchCaps.getValidTimeInterval()).toBe('6m');
    });
  });

});
