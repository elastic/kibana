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
} from '../../../common/runtime_types';
import { validate } from './validation';

describe('[Monitor Management] validation', () => {
  const commonPropsValid: Partial<MonitorFields> = {
    [ConfigKey.SCHEDULE]: { number: '5', unit: ScheduleUnit.MINUTES },
    [ConfigKey.TIMEOUT]: '3m',
  };

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
  });

  describe.each([
    [ConfigKey.SOURCE_INLINE, 'step(() => {});'],
    [ConfigKey.SOURCE_ZIP_URL, 'https://test.zip'],
  ])('Browser', (configKey, value) => {
    const browserProps: Partial<BrowserFields> = {
      ...commonPropsValid,
      [ConfigKey.MONITOR_TYPE]: DataStream.BROWSER,
      [ConfigKey.TIMEOUT]: null,
      [configKey]: value,
    };

    it('should return false for all valid props', () => {
      const validators = validate[DataStream.BROWSER];
      const keysToValidate = [ConfigKey.SCHEDULE, ConfigKey.TIMEOUT, configKey];
      const validatorFns = keysToValidate.map((key) => validators[key]);
      const result = validatorFns.map((fn) => fn?.(browserProps) ?? true);

      expect(result).not.toEqual(expect.arrayContaining([true]));
    });
  });

  // TODO: Add test for other monitor types if needed
});
