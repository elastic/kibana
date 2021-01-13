/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash';
import { deprecations as deprecationsModule } from './deprecations';

describe('monitoring plugin deprecations', function () {
  let transformDeprecations;
  const rename = jest.fn(() => jest.fn());
  const renameFromRoot = jest.fn(() => jest.fn());
  const fromPath = 'monitoring';

  beforeAll(function () {
    const deprecations = deprecationsModule({ rename, renameFromRoot });
    transformDeprecations = (settings, fromPath, log = noop) => {
      deprecations.forEach((deprecation) => deprecation(settings, fromPath, log));
    };
  });

  describe('cluster_alerts.email_notifications.email_address', function () {
    it(`shouldn't log when email notifications are disabled`, function () {
      const settings = {
        cluster_alerts: {
          email_notifications: {
            enabled: false,
          },
        },
      };

      const log = jest.fn();
      transformDeprecations(settings, fromPath, log);
      expect(log).not.toHaveBeenCalled();
    });

    it(`shouldn't log when cluster alerts are disabled`, function () {
      const settings = {
        cluster_alerts: {
          enabled: false,
          email_notifications: {
            enabled: true,
          },
        },
      };

      const log = jest.fn();
      transformDeprecations(settings, fromPath, log);
      expect(log).not.toHaveBeenCalled();
    });

    it(`shouldn't log when email_address is specified`, function () {
      const settings = {
        cluster_alerts: {
          enabled: true,
          email_notifications: {
            enabled: true,
            email_address: 'foo@bar.com',
          },
        },
      };

      const log = jest.fn();
      transformDeprecations(settings, fromPath, log);
      expect(log).not.toHaveBeenCalled();
    });

    it(`should log when email_address is missing, but alerts/notifications are both enabled`, function () {
      const settings = {
        cluster_alerts: {
          enabled: true,
          email_notifications: {
            enabled: true,
          },
        },
      };

      const log = jest.fn();
      transformDeprecations(settings, fromPath, log);
      expect(log).toHaveBeenCalled();
    });
  });

  describe('elasticsearch.username', function () {
    it('logs a warning if elasticsearch.username is set to "elastic"', () => {
      const settings = { elasticsearch: { username: 'elastic' } };

      const log = jest.fn();
      transformDeprecations(settings, fromPath, log);
      expect(log).toHaveBeenCalled();
    });

    it('logs a warning if elasticsearch.username is set to "kibana"', () => {
      const settings = { elasticsearch: { username: 'kibana' } };

      const log = jest.fn();
      transformDeprecations(settings, fromPath, log);
      expect(log).toHaveBeenCalled();
    });

    it('does not log a warning if elasticsearch.username is set to something besides "elastic" or "kibana"', () => {
      const settings = { elasticsearch: { username: 'otheruser' } };

      const log = jest.fn();
      transformDeprecations(settings, fromPath, log);
      expect(log).not.toHaveBeenCalled();
    });

    it('does not log a warning if elasticsearch.username is unset', () => {
      const settings = { elasticsearch: { username: undefined } };

      const log = jest.fn();
      transformDeprecations(settings, fromPath, log);
      expect(log).not.toHaveBeenCalled();
    });

    it('logs a warning if ssl.key is set and ssl.certificate is not', () => {
      const settings = { elasticsearch: { ssl: { key: '' } } };

      const log = jest.fn();
      transformDeprecations(settings, fromPath, log);
      expect(log).toHaveBeenCalled();
    });

    it('logs a warning if ssl.certificate is set and ssl.key is not', () => {
      const settings = { elasticsearch: { ssl: { certificate: '' } } };

      const log = jest.fn();
      transformDeprecations(settings, fromPath, log);
      expect(log).toHaveBeenCalled();
    });

    it('does not log a warning if both ssl.key and ssl.certificate are set', () => {
      const settings = { elasticsearch: { ssl: { key: '', certificate: '' } } };

      const log = jest.fn();
      transformDeprecations(settings, fromPath, log);
      expect(log).not.toHaveBeenCalled();
    });
  });

  describe('xpack_api_polling_frequency_millis', () => {
    it('should call rename for this renamed config key', () => {
      const settings = { xpack_api_polling_frequency_millis: 30000 };
      const log = jest.fn();
      transformDeprecations(settings, fromPath, log);
      expect(rename).toHaveBeenCalled();
    });
  });
});
