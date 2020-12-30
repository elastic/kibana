/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { deserializeTime, serializeTime } from './time_serialization';
import { TIME_UNITS } from '../constants';

describe('time_serialization', () => {
  describe('deserializeTime()', () => {
    it('should deserialize valid ES time', () => {
      Object.values(TIME_UNITS).forEach((unit) => {
        expect(deserializeTime(`15${unit}`)).toEqual({
          timeValue: 15,
          timeUnit: unit,
        });
      });
    });
    it('should return an empty object if time unit is invalid', () => {
      expect(deserializeTime('15foobar')).toEqual({});
      expect(deserializeTime('15minutes')).toEqual({});
    });
  });
  describe('serializeTime()', () => {
    it('should serialize ES time', () => {
      expect(serializeTime(15, 'd')).toEqual('15d');
    });
  });
});
