/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMoment } from './get_moment';

describe('get_moment', () => {
  describe('getMoment', () => {
    it(`returns a moment object when passed a date`, () => {
      const moment = getMoment('2017-03-30T14:53:08.121Z');

      expect(moment?.constructor.name).toBe('Moment');
    });

    it(`returns null when passed falsy`, () => {
      const results = [getMoment(''), getMoment(null), getMoment(undefined)];

      results.forEach((result) => {
        expect(result).toBe(null);
      });
    });
  });
});
