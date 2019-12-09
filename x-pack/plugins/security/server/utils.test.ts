/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { duration } from 'moment';
import { durationToMs } from './utils';

describe('security utils', () => {
  describe('#durationToMs', () => {
    const sixtySeconds = 60000;

    it('converts a duration to a number', () => {
      const _duration = duration(sixtySeconds);
      const result = durationToMs(_duration);
      expect(result).toEqual(sixtySeconds);
    });

    it('returns a number', () => {
      const result = durationToMs(sixtySeconds);
      expect(result).toEqual(sixtySeconds);
    });

    it('returns null', () => {
      const result = durationToMs(null);
      expect(result).toEqual(null);
    });
  });
});
