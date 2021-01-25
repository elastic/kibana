/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getDefaultAdminEmail } from './get_settings_collector';

describe('getSettingsCollector / getDefaultAdminEmail', () => {
  function setup({ enabled = true, adminEmail = null } = {}) {
    return {
      cluster_alerts: {
        email_notifications: {
          email_address: adminEmail,
          enabled: enabled,
        },
      },
      kibana: {
        index: '.kibana',
      },
      pkg: {
        version: '1.1.1',
      },
    };
  }

  describe('monitoring.cluster_alerts.email_notifications.enabled = false', () => {
    it('returns null when email is defined', async () => {
      const config = setup({ enabled: false });
      expect(await getDefaultAdminEmail(config)).toBe(null);
    });

    it('returns null when email is undefined', async () => {
      const config = setup({ enabled: false });
      expect(await getDefaultAdminEmail(config)).toBe(null);
    });
  });

  describe('monitoring.cluster_alerts.email_notifications.enabled = true', () => {
    it('returns value when email is defined', async () => {
      const config = setup({ adminEmail: 'hello@world' });
      expect(await getDefaultAdminEmail(config)).toBe('hello@world');
    });
    it('returns null when email is undefined', async () => {
      const config = setup();
      expect(await getDefaultAdminEmail(config)).toBe(null);
    });
  });
});
