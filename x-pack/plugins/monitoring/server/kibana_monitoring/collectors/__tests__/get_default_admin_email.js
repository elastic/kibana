/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { getDefaultAdminEmail } from '../get_settings_collector';

describe('getSettingsCollector / getDefaultAdminEmail', () => {
  function setup({ enabled = true, adminEmail = null } = {}) {
    const config = {
      cluster_alerts: {
        email_notifications: {
          enabled,
          email_address: adminEmail,
        },
      },
    };

    return config;
  }

  describe('monitoring.cluster_alerts.email_notifications.enabled = false', () => {
    it('returns null when email is defined', async () => {
      const config = setup({ enabled: false });
      expect(await getDefaultAdminEmail(config)).to.be(null);
    });

    it('returns null when email is undefined', async () => {
      const config = setup({ enabled: false });
      expect(await getDefaultAdminEmail(config)).to.be(null);
    });
  });

  describe('monitoring.cluster_alerts.email_notifications.enabled = true', () => {
    it('returns value when email is defined', async () => {
      const config = setup({ adminEmail: 'hello@world' });
      expect(await getDefaultAdminEmail(config)).to.be('hello@world');
    });
    it('returns null when email is undefined', async () => {
      const config = setup();
      expect(await getDefaultAdminEmail(config)).to.be(null);
    });
  });
});
