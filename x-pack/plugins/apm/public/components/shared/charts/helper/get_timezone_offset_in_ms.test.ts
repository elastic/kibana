/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimezoneOffsetInMs } from './get_timezone_offset_in_ms';
import moment from 'moment-timezone';

// FAILING: https://github.com/elastic/kibana/issues/50005
describe('getTimezoneOffsetInMs', () => {
  let originalTimezone: moment.MomentZone | null;

  beforeAll(() => {
    // @ts-expect-error moment types do not define defaultZone but it's there
    originalTimezone = moment.defaultZone;
  });

  afterAll(() => {
    moment.tz.setDefault(originalTimezone ? originalTimezone.name : '');
  });

  describe('when no default timezone is set', () => {
    it('guesses the timezone', () => {
      moment.tz.setDefault();

      const guess = jest.fn(() => 'Etc/UTC');
      jest.spyOn(moment.tz, 'guess').mockImplementationOnce(guess);

      getTimezoneOffsetInMs(Date.now());

      expect(guess).toHaveBeenCalled();
    });
  });

  describe('when a default timezone is set', () => {
    it('returns the time in milliseconds', () => {
      moment.tz.setDefault('America/Denver');
      const now = Date.now();
      // get the expected offset from moment to prevent any issues with DST
      const expectedOffset =
        moment.tz.zone('America/Denver')!.parse(now) * 60000;
      expect(getTimezoneOffsetInMs(Date.now())).toEqual(expectedOffset);
    });
  });
});
