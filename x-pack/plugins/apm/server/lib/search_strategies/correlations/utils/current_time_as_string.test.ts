/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { currentTimeAsString } from './current_time_as_string';

describe('aggregation utils', () => {
  describe('currentTimeAsString', () => {
    it('returns the current time as a string', () => {
      const mockDate = new Date(1392202800000);
      // @ts-ignore ignore the mockImplementation callback error
      const spy = jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const timeString = currentTimeAsString();

      expect(timeString).toEqual('2014-02-12T11:00:00.000Z');

      spy.mockRestore();
    });
  });
});
