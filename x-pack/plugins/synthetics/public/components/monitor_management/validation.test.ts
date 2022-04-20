/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConfigKey,
  DataStream,
  HTTPFields,
  BrowserFields,
  MonitorFields,
  ScheduleUnit,
  ServiceLocations,
} from '../../../common/runtime_types';
import { validate, validateCommon } from './validation';

describe('[Monitor Management] validation', () => {
  const commonPropsValid: Partial<MonitorFields> = {
    [ConfigKey.SCHEDULE]: { number: '5', unit: ScheduleUnit.MINUTES },
    [ConfigKey.TIMEOUT]: '3m',
    [ConfigKey.LOCATIONS]: [
      {
        id: 'test-service-location',
        isServiceManaged: true,
        url: 'https:test-url.com',
        geo: { lat: 33.33432323, lon: 73.23424221 },
        label: 'EU West',
      },
    ] as ServiceLocations,
    [ConfigKey.NAME]: 'test-name',
    [ConfigKey.NAMESPACE]: 'namespace',
  };

  describe('Common monitor fields', () => {
    it('should return false for all valid props', () => {
      const result = Object.values(validateCommon).map((validator) => {
        return validator ? validator(commonPropsValid) : true;
      });

      expect(result.reduce((previous, current) => previous || current)).toBeFalsy();
    });

    it('should invalidate on invalid namespace', () => {
      const validatorFn = validateCommon[ConfigKey.NAMESPACE];
      const result = [undefined, null, '', '*/&<>:', 'A', 'a'.repeat(101)].map((testValue) =>
        validatorFn?.({ [ConfigKey.NAMESPACE]: testValue } as Partial<MonitorFields>)
      );

      expect(result.reduce((previous, current) => previous && current)).toBeTruthy();
    });
  });

  describe('HTTP', () => {
    const httpPropsValid: Partial<HTTPFields> = {
      ...commonPropsValid,
      [ConfigKey.RESPONSE_STATUS_CHECK]: ['200', '204'],
      [ConfigKey.RESPONSE_HEADERS_CHECK]: { 'Content-Type': 'application/json' },
      [ConfigKey.REQUEST_HEADERS_CHECK]: { 'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8' },
      [ConfigKey.MAX_REDIRECTS]: '3',
      [ConfigKey.URLS]: 'https:// example-url.com',
    };

    it('should return false for all valid props', () => {
      const validators = validate[DataStream.HTTP];
      const keysToValidate = [
        ConfigKey.SCHEDULE,
        ConfigKey.TIMEOUT,
        ConfigKey.LOCATIONS,
        ConfigKey.RESPONSE_STATUS_CHECK,
        ConfigKey.RESPONSE_HEADERS_CHECK,
        ConfigKey.REQUEST_HEADERS_CHECK,
        ConfigKey.MAX_REDIRECTS,
        ConfigKey.URLS,
      ];
      const validatorFns = keysToValidate.map((key) => validators[key]);
      const result = validatorFns.map((fn) => fn?.(httpPropsValid) ?? true);

      expect(result).not.toEqual(expect.arrayContaining([true]));
    });

    it('should invalidate when locations is empty', () => {
      const validators = validate[DataStream.HTTP];
      const validatorFn = validators[ConfigKey.LOCATIONS];
      const result = [undefined, null, []].map(
        (testValue) =>
          validatorFn?.({ [ConfigKey.LOCATIONS]: testValue } as Partial<MonitorFields>) ?? false
      );

      expect(result).toEqual([true, true, true]);
    });
  });

  describe.each([
    [ConfigKey.SOURCE_INLINE, 'step(() => {});'],
    [ConfigKey.SOURCE_ZIP_URL, 'https://test.zip'],
  ])('Browser', (configKey, value) => {
    const browserProps: Partial<BrowserFields> = {
      ...commonPropsValid,
      [ConfigKey.MONITOR_TYPE]: DataStream.BROWSER,
      [ConfigKey.TIMEOUT]: undefined,
      [configKey]: value,
    };

    it('should return false for all valid props', () => {
      const validators = validate[DataStream.BROWSER];
      const keysToValidate = [ConfigKey.SCHEDULE, ConfigKey.TIMEOUT, configKey];
      const validatorFns = keysToValidate.map((key) => validators[key]);
      const result = validatorFns.map((fn) => fn?.(browserProps) ?? true);

      expect(result).not.toEqual(expect.arrayContaining([true]));
    });

    it('should invalidate when locations is empty', () => {
      const validators = validate[DataStream.BROWSER];
      const validatorFn = validators[ConfigKey.LOCATIONS];
      const result = [undefined, null, []].map(
        (testValue) =>
          validatorFn?.({ [ConfigKey.LOCATIONS]: testValue } as Partial<MonitorFields>) ?? false
      );

      expect(result).toEqual([true, true, true]);
    });
  });

  // TODO: Add test for other monitor types if needed
});
