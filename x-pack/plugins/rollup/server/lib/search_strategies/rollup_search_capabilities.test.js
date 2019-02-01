/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import getRollupSearchCapabilities from './rollup_search_capabilities';

class DefaultSearchCapabilities {
  constructor(request, batchRequestsSupport, fieldsCapabilities = {}) {
    this.fieldsCapabilities = fieldsCapabilities;
    this.validateTimeIntervalRules = [];
  }

  get defaultTimeIntervalInSeconds() {
    return this.getIntervalInSeconds(this.defaultTimeInterval);
  }

  getIntervalInSeconds(intervalString) {
    return Number.parseInt(intervalString);
  }

  isTimeIntervalValid(interval) {
    return this.validateTimeIntervalRules
      .every(validationRule => validationRule(this.getIntervalInSeconds(interval), this.defaultTimeIntervalInSeconds));
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
    expect(rollupSearchCaps.isTimeIntervalValid).toBeDefined();
    expect(rollupSearchCaps.fieldsCapabilities).toBe(fieldsCapabilities);
    expect(rollupSearchCaps.rollupIndex).toBe(rollupIndex);
  });

  test('should return the "timezone" for the rollup request', () => {
    expect(rollupSearchCaps.fixedTimeZone).toBe(testTimeZone);
  });

  test('should return the default "interval" for the rollup request', () => {
    expect(rollupSearchCaps.defaultTimeInterval).toBe(testInterval);
  });

  describe('intervalMultiple', () => {
    let intervalMultiple;

    beforeEach(() => {
      [intervalMultiple] = rollupSearchCaps.validateTimeIntervalRules;
    });

    test('should add intervalMultiple into validation rules', () => {
      expect(intervalMultiple).toBeDefined();
    });

    test('should return true for multiple intervals', () => {
      expect(intervalMultiple(6, 3)).toBeTruthy();
      expect(intervalMultiple(10, 5)).toBeTruthy();
    });

    test('should return false for not multiple intervals', () => {
      expect(intervalMultiple(7, 3)).toBeFalsy();
      expect(intervalMultiple(21, 10)).toBeFalsy();
    });
  });

  describe('getValidTimeInterval', () => {
    test('interval should be greater than default interval', () => {
      expect(rollupSearchCaps.getValidTimeInterval('1s')).toBe(testInterval);
    });

    test('should round interval', () => {
      expect(rollupSearchCaps.getValidTimeInterval('11s')).toBe('20s');
    });
  });
});
