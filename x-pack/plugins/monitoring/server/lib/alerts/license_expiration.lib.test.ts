/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment-timezone';
import { executeActions, getUiMessage } from './license_expiration.lib';

describe('licenseExpiration lib', () => {
  describe('executeActions', () => {
    const clusterName = 'clusterA';
    const instance: any = { scheduleActions: jest.fn() };
    const license: any = { clusterName };
    const $expiry = moment('2020-01-20');
    const dateFormat = 'dddd, MMMM Do YYYY, h:mm:ss a';
    const emailAddress = 'test@test.com';

    beforeEach(() => {
      instance.scheduleActions.mockClear();
    });

    it('should schedule actions when firing', () => {
      executeActions(instance, license, $expiry, dateFormat, emailAddress, false);
      expect(instance.scheduleActions).toHaveBeenCalledWith('default', {
        subject: 'NEW X-Pack Monitoring: License Expiration',
        message: `Cluster '${clusterName}' license is going to expire on Monday, January 20th 2020, 12:00:00 am. Please update your license.`,
        to: emailAddress,
      });
    });

    it('should schedule actions when resolved', () => {
      executeActions(instance, license, $expiry, dateFormat, emailAddress, true);
      expect(instance.scheduleActions).toHaveBeenCalledWith('default', {
        subject: 'RESOLVED X-Pack Monitoring: License Expiration',
        message: `This cluster alert has been resolved: Cluster '${clusterName}' license was going to expire on Monday, January 20th 2020, 12:00:00 am.`,
        to: emailAddress,
      });
    });
  });

  describe('getUiMessage', () => {
    const timezone = 'Europe/London';
    const license: any = { expiryDateMS: moment.tz('2020-01-20 08:00:00', timezone).utc() };

    it('should return a message when firing', () => {
      const message = getUiMessage(license, timezone, false);
      expect(message).toBe(`This cluster's license is going to expire in #relative at #absolute.`);
    });

    it('should return a message when resolved', () => {
      const message = getUiMessage(license, timezone, true);
      expect(message).toBe(`This cluster's license is active.`);
    });
  });
});
