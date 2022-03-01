/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getApmSettings } from './apm_settings';
import { isSettingsFormValid } from '../settings_form/utils';

describe('apm_settings', () => {
  describe('isAPMFormValid', () => {
    describe('validates integer fields', () => {
      ['max_header_bytes', 'max_event_bytes'].map((key) => {
        it(`returns false when ${key} is lower than 1`, () => {
          const settings = getApmSettings();
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
      ['max_connections'].map((key) => {
        it(`returns false when ${key} is lower than 0`, () => {
          const settings = getApmSettings();
          expect(
            isSettingsFormValid(settings, {
              [key]: { value: -1, type: 'integer' },
            })
          ).toBeFalsy();
        });
      });
    });

    describe('validates required fields', () => {
      ['host', 'url'].map((key) => {
        it(`return false when  ${key} is not defined`, () => {
          const settings = getApmSettings();
          expect(isSettingsFormValid(settings, {})).toBeFalsy();
        });
      });
    });

    describe('validates duration fields', () => {
      ['idle_timeout', 'read_timeout', 'shutdown_timeout', 'write_timeout'].map(
        (key) => {
          it(`return false when  ${key} lower then 1ms`, () => {
            const settings = getApmSettings();
            expect(
              isSettingsFormValid(settings, {
                [key]: { value: '0ms', type: 'text' },
              })
            ).toBeFalsy();
          });
        }
      );
    });
  });
});
