/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getApmSettings, isAPMFormValid } from './apm_settings';
import { SettingDefinition, Setting } from '../typings';

describe('apm_settings', () => {
  describe('getApmSettings', () => {
    function findSetting(key: string, settings: SettingDefinition[]): Setting {
      return settings.find(
        (setting) => setting.type !== 'advanced_settings' && setting.key === key
      ) as Setting;
    }
    ['host', 'url'].map((key) => {
      it(`returns read only ${key} when on cloud`, () => {
        const settings = getApmSettings(true);
        const setting = findSetting(key, settings);
        expect(setting.readOnly).toBeTruthy();
      });
      it(`returns ${key} when NOT on cloud`, () => {
        const settings = getApmSettings(false);
        const setting = findSetting(key, settings);
        expect(setting.readOnly).toBeFalsy();
      });
    });
  });

  describe('isAPMFormValid', () => {
    describe('validates integer fields', () => {
      ['max_header_bytes', 'max_event_bytes'].map((key) => {
        it(`returns false when ${key} is lower than 1`, () => {
          const settings = getApmSettings(true);
          expect(
            isAPMFormValid({ [key]: { value: 0, type: 'integer' } }, settings)
          ).toBeFalsy();

          expect(
            isAPMFormValid({ [key]: { value: -1, type: 'integer' } }, settings)
          ).toBeFalsy();
        });
      });
      ['max_connections'].map((key) => {
        it(`returns false when ${key} is lower than 0`, () => {
          const settings = getApmSettings(true);
          expect(
            isAPMFormValid({ [key]: { value: -1, type: 'integer' } }, settings)
          ).toBeFalsy();
        });
      });
    });

    describe('validates required fields', () => {
      ['host', 'url'].map((key) => {
        it(`return false when  ${key} is not defined`, () => {
          const settings = getApmSettings(true);
          expect(isAPMFormValid({}, settings)).toBeFalsy();
        });
      });
    });

    describe('validates duration fields', () => {
      ['idle_timeout', 'read_timeout', 'shutdown_timeout', 'write_timeout'].map(
        (key) => {
          it(`return false when  ${key} lower then 1ms`, () => {
            const settings = getApmSettings(true);
            expect(
              isAPMFormValid(
                { [key]: { value: '0ms', type: 'text' } },
                settings
              )
            ).toBeFalsy();
          });
        }
      );
    });
  });
});
