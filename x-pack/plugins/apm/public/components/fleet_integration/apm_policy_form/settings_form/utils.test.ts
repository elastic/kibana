/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getDurationRt } from '../../../../../common/agent_configuration/runtime_types/duration_rt';
import { getIntegerRt } from '../../../../../common/agent_configuration/runtime_types/integer_rt';
import { PackagePolicyVars, SettingsRow } from '../typings';
import {
  mergeNewVars,
  isSettingsFormValid,
  validateSettingValue,
} from './utils';

describe('settings utils', () => {
  describe('validateSettingValue', () => {
    it('returns invalid when setting is required and value is empty', () => {
      const setting: SettingsRow = {
        key: 'foo',
        type: 'text',
        required: true,
      };
      expect(validateSettingValue(setting, undefined)).toEqual({
        isValid: false,
        message: 'Required field',
      });
    });
    it('returns valid when setting is NOT required and value is empty', () => {
      const setting: SettingsRow = {
        key: 'foo',
        type: 'text',
      };
      expect(validateSettingValue(setting, undefined)).toEqual({
        isValid: true,
        message: 'Required field',
      });
    });
    it('returns valid when setting does not have a validation property', () => {
      const setting: SettingsRow = {
        key: 'foo',
        type: 'text',
      };
      expect(validateSettingValue(setting, 'foo')).toEqual({
        isValid: true,
        message: '',
      });
    });
    it('returns valid after validating duration value', () => {
      const setting: SettingsRow = {
        key: 'foo',
        type: 'text',
        validation: getDurationRt({ min: '1ms' }),
      };
      expect(validateSettingValue(setting, '2ms')).toEqual({
        isValid: true,
        message: 'No errors!',
      });
    });
    it('returns invalid after validating duration value', () => {
      const setting: SettingsRow = {
        key: 'foo',
        type: 'text',
        validation: getDurationRt({ min: '1ms' }),
      };
      expect(validateSettingValue(setting, 'foo')).toEqual({
        isValid: false,
        message: 'Must be greater than 1ms',
      });
    });
    it('returns valid after validating integer value', () => {
      const setting: SettingsRow = {
        key: 'foo',
        type: 'text',
        validation: getIntegerRt({ min: 1 }),
      };
      expect(validateSettingValue(setting, 1)).toEqual({
        isValid: true,
        message: 'No errors!',
      });
    });
    it('returns invalid after validating integer value', () => {
      const setting: SettingsRow = {
        key: 'foo',
        type: 'text',
        validation: getIntegerRt({ min: 1 }),
      };
      expect(validateSettingValue(setting, 0)).toEqual({
        isValid: false,
        message: 'Must be greater than 1',
      });
    });

    it('returns valid when required and value is empty', () => {
      const setting: SettingsRow = {
        key: 'foo',
        type: 'text',
        required: true,
      };
      expect(validateSettingValue(setting, '')).toEqual({
        isValid: false,
        message: 'Required field',
      });
    });
  });
  describe('isSettingsFormValid', () => {
    const settings: SettingsRow[] = [
      { key: 'foo', type: 'text', required: true },
      {
        key: 'bar',
        type: 'text',
        settings: [{ type: 'text', key: 'bar_1', required: true }],
      },
      { key: 'baz', type: 'text', validation: getDurationRt({ min: '1ms' }) },
      {
        type: 'advanced_setting',
        settings: [
          {
            type: 'text',
            key: 'advanced_1',
            required: true,
            settings: [
              {
                type: 'text',
                key: 'advanced_1_1',
                validation: getDurationRt({ min: '1ms' }),
                settings: [
                  {
                    type: 'text',
                    key: 'advanced_1_1_1',
                    required: true,
                    validation: getDurationRt({ min: '1ms' }),
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
    it('returns false when form is invalid', () => {
      const vars: PackagePolicyVars = {
        foo: { value: undefined, type: 'text' },
        bar: { value: undefined, type: 'text' },
        baz: { value: 'baz', type: 'text' },
        advanced_1: { value: undefined, type: 'text' },
        advanced_1_1: { value: '1', type: 'text' },
        advanced_1_1_1: { value: undefined, type: 'text' },
      };
      expect(isSettingsFormValid(settings, vars)).toBeFalsy();
    });
    it('returns true when form is valid', () => {
      const vars: PackagePolicyVars = {
        foo: { value: 'foo', type: 'text' },
        bar: { value: undefined, type: 'text' },
        bar_1: { value: 'bar_1' },
        baz: { value: '1ms', type: 'text' },
        advanced_1: { value: 'advanced_1', type: 'text' },
        advanced_1_1: { value: undefined, type: 'text' },
        advanced_1_1_1: { value: '1s', type: 'text' },
      };
      expect(isSettingsFormValid(settings, vars)).toBeTruthy();
    });
  });
  describe('mergeNewVars', () => {
    it('updates key value', () => {
      const vars: PackagePolicyVars = {
        foo: { value: 'foo', type: 'text' },
        bar: { value: undefined, type: 'text' },
        baz: { value: '1ms', type: 'text' },
        qux: { value: undefined, type: 'text' },
      };
      const newVars = mergeNewVars(vars, 'qux', 'qux');
      expect(newVars).toEqual({
        foo: { value: 'foo', type: 'text' },
        bar: { value: undefined, type: 'text' },
        baz: { value: '1ms', type: 'text' },
        qux: { value: 'qux', type: 'text' },
      });
    });
  });
});
