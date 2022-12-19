/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IUiSettingsClient } from '@kbn/core/public';
import { DEFAULT_DATE_FORMAT, DEFAULT_DATE_FORMAT_TZ } from '../constants';

/**
 * Creates an object to pass to the uiSettings property when creating a KibanaReacrContext (see src/plugins/kibana_react/public/context/context.tsx).
 * @param dateFormat defaults to ''
 * @param timezone defaults to 'UTC
 * @returns the object {@link IUiSettingsClient}
 */
export const mockUiSettingsService = (dateFormat: string = '', timezone: string = 'UTC') =>
  ({
    get: (key: string) => {
      const settings = {
        [DEFAULT_DATE_FORMAT]: dateFormat,
        [DEFAULT_DATE_FORMAT_TZ]: timezone,
      };
      // @ts-expect-error
      return settings[key];
    },
  } as unknown as IUiSettingsClient);

/**
 * Mocks date format or timezone for testing.
 * @param key dateFormat | dateFormat:tz
 * @returns string
 */
export function mockUiSetting(key: string): string | undefined {
  if (key === 'dateFormat') {
    return 'MMM D, YYYY @ HH:mm:ss.SSS';
  }
  if (key === 'dateFormat:tz') {
    return 'America/New_York';
  }
}
