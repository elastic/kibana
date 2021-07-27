/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getDurationRt } from '../../../../../common/agent_configuration/runtime_types/duration_rt';
import { PackagePolicyVars } from '../typings';
import { SettingDefinition } from './typings';
import {
  mergeNewVars,
  isSettingsFormValid,
  validateSettingValue,
} from './utils';

describe('settings utils', () => {
  describe('validateSettingValue', () => {
    it('returns invalid when setting is required and value is empty', () => {
      const setting: SettingDefinition = {
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
      const setting: SettingDefinition = {
        key: 'foo',
        type: 'text',
      };
      expect(validateSettingValue(setting, undefined)).toEqual({
        isValid: true,
        message: '',
      });
    });
    it('returns valid when setting does not have a validation property', () => {
      const setting: SettingDefinition = {
        key: 'foo',
        type: 'text',
      };
      expect(validateSettingValue(setting, 'foo')).toEqual({
        isValid: true,
        message: '',
      });
    });
    it('returns valid after validating value', () => {
      const setting: SettingDefinition = {
        key: 'foo',
        type: 'text',
        validation: getDurationRt({ min: '1ms' }),
      };
      expect(validateSettingValue(setting, '2ms')).toEqual({
        isValid: true,
        message: 'No errors!',
      });
    });
    it('returns invalid after validating value', () => {
      const setting: SettingDefinition = {
        key: 'foo',
        type: 'text',
        validation: getDurationRt({ min: '1ms' }),
      };
      expect(validateSettingValue(setting, 'foo')).toEqual({
        isValid: false,
        message: 'Must be greater than 1ms',
      });
    });
  });
  describe('isSettingsFormValid', () => {
    it('returns false when form is invalid', () => {
      const settings: SettingDefinition[] = [
        { key: 'foo', type: 'text', required: true },
        { key: 'bar', type: 'text' },
        { key: 'baz', type: 'text', validation: getDurationRt({ min: '1ms' }) },
      ];
      const vars: PackagePolicyVars = {
        foo: { value: undefined, type: 'text' },
        bar: { value: undefined, type: 'text' },
        baz: { value: 'baz', type: 'text' },
      };
      expect(isSettingsFormValid(settings, vars)).toBeFalsy();
    });
    it('returns true when form is valid', () => {
      const settings: SettingDefinition[] = [
        { key: 'foo', type: 'text', required: true },
        { key: 'bar', type: 'text' },
        { key: 'baz', type: 'text', validation: getDurationRt({ min: '1ms' }) },
      ];
      const vars: PackagePolicyVars = {
        foo: { value: 'foo', type: 'text' },
        bar: { value: undefined, type: 'text' },
        baz: { value: '1ms', type: 'text' },
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
