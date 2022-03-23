/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAgentAuthorizationSettings } from './agent_authorization_settings';
import { SettingsRow } from '../typings';
import { isSettingsFormValid } from '../settings_form/utils';

describe('apm-fleet-apm-integration', () => {
  describe('getAgentAuthorizationSettings', () => {
    function findSetting(key: string, settings: SettingsRow[]) {
      return settings.find(
        (setting) => setting.type !== 'advanced_setting' && setting.key === key
      );
    }
    it('returns read only secret token when on cloud', () => {
      const settings = getAgentAuthorizationSettings({ isCloudPolicy: true });
      const secretToken = findSetting('secret_token', settings);
      expect(secretToken).toEqual({
        type: 'text',
        key: 'secret_token',
        labelAppend: 'Optional',
        label: 'Secret token',
      });
    });
    it('returns secret token when NOT on cloud', () => {
      const settings = getAgentAuthorizationSettings({ isCloudPolicy: false });
      const secretToken = findSetting('secret_token', settings);

      expect(secretToken).toEqual({
        type: 'text',
        key: 'secret_token',
        labelAppend: 'Optional',
        label: 'Secret token',
      });
    });
  });

  describe('isAgentAuthorizationFormValid', () => {
    describe('validates integer fields', () => {
      [
        'api_key_limit',
        'anonymous_rate_limit_ip_limit',
        'anonymous_rate_limit_event_limit',
      ].map((key) => {
        it(`returns false when ${key} is lower than 1`, () => {
          const settings = getAgentAuthorizationSettings({
            isCloudPolicy: true,
          });
          expect(
            isSettingsFormValid(settings, {
              [key]: { value: 0, type: 'integer' },
            })
          ).toBeFalsy();

          expect(
            isSettingsFormValid(settings, {
              [key]: { value: -1, type: 'integer' },
            })
          ).toBeFalsy();
        });
      });
    });
  });
});
