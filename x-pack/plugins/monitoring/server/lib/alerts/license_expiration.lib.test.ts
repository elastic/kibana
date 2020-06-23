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
    it('should return a message when firing', () => {
      const message = getUiMessage(false);
      expect(message.text).toBe(
        `This cluster's license is going to expire in #relative at #absolute. #start_linkPlease update your license.#end_link`
      );
      // LOL How do I avoid this in TS????
      if (!message.tokens) {
        return expect(false).toBe(true);
      }
      expect(message.tokens.length).toBe(3);
      expect(message.tokens[0].startToken).toBe('#relative');
      expect(message.tokens[1].startToken).toBe('#absolute');
      expect(message.tokens[2].startToken).toBe('#start_link');
      expect(message.tokens[2].endToken).toBe('#end_link');
    });

    it('should return a message when resolved', () => {
      const message = getUiMessage(true);
      expect(message.text).toBe(`This cluster's license is active.`);
      expect(message.tokens).not.toBeDefined();
    });
  });
});
