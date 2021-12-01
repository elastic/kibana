/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { IUiSettingsClient } from '../../../../../../../../src/core/public';
import { getDomainTZ, getTimeTicksTZ, getTimeZone } from './timezone';

describe('Timezone helper', () => {
  let originalTimezone: moment.MomentZone | null;
  const min = new Date('Tue Jan 28 2020 05:36:00 GMT+0100').valueOf();
  const max = new Date('Wed Jan 29 2020 07:12:00 GMT+0100').valueOf();

  afterAll(() => {
    moment.tz.setDefault(originalTimezone ? originalTimezone.name : '');
  });
  describe('getTimeTicksTZ', () => {
    it('returns ticks when in Ameca/New_York timezone', () => {
      moment.tz.setDefault('America/New_York');
      expect(
        getTimeTicksTZ({ domain: [min, max], totalTicks: 8, width: 1138 })
      ).toEqual([
        new Date('2020-01-28T11:00:00.000Z'),
        new Date('2020-01-28T14:00:00.000Z'),
        new Date('2020-01-28T17:00:00.000Z'),
        new Date('2020-01-28T20:00:00.000Z'),
        new Date('2020-01-28T23:00:00.000Z'),
        new Date('2020-01-29T02:00:00.000Z'),
        new Date('2020-01-29T05:00:00.000Z'),
        new Date('2020-01-29T08:00:00.000Z'),
        new Date('2020-01-29T11:00:00.000Z'),
      ]);
    });
    it('returns ticks when in Europe/Amsterdam timezone', () => {
      moment.tz.setDefault('Europe/Amsterdam');
      expect(
        getTimeTicksTZ({ domain: [min, max], totalTicks: 8, width: 1138 })
      ).toEqual([
        new Date('2020-01-28T05:00:00.000Z'),
        new Date('2020-01-28T08:00:00.000Z'),
        new Date('2020-01-28T11:00:00.000Z'),
        new Date('2020-01-28T14:00:00.000Z'),
        new Date('2020-01-28T17:00:00.000Z'),
        new Date('2020-01-28T20:00:00.000Z'),
        new Date('2020-01-28T23:00:00.000Z'),
        new Date('2020-01-29T02:00:00.000Z'),
        new Date('2020-01-29T05:00:00.000Z'),
      ]);
    });
  });

  describe('getDomainTZ', () => {
    it('returns domain when in Ameca/New_York timezone', () => {
      moment.tz.setDefault('America/New_York');
      expect(getDomainTZ(min, max)).toEqual([
        new Date('Tue Jan 28 2020 00:36:00 GMT+0100').valueOf(),
        new Date('Wed Jan 29 2020 02:12:00 GMT+0100').valueOf(),
      ]);
    });
    it('returns domain when in Europe/Amsterdam timezone', () => {
      moment.tz.setDefault('Europe/Amsterdam');
      expect(getDomainTZ(min, max)).toEqual([
        new Date('Tue Jan 28 2020 06:36:00 GMT+0100').valueOf(),
        new Date('Wed Jan 29 2020 08:12:00 GMT+0100').valueOf(),
      ]);
    });
  });

  describe('getTimeZone', () => {
    it('returns local when uiSettings is undefined', () => {
      expect(getTimeZone()).toEqual('local');
    });

    it('returns local when uiSettings returns Browser', () => {
      expect(
        getTimeZone({ get: () => 'Browser' } as unknown as IUiSettingsClient)
      ).toEqual('local');
    });
    it('returns timezone defined on uiSettings', () => {
      const timezone = 'America/toronto';
      expect(
        getTimeZone({ get: () => timezone } as unknown as IUiSettingsClient)
      ).toEqual(timezone);
    });
  });
});
