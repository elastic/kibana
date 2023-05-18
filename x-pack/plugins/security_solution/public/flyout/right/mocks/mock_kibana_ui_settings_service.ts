/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/public';

const DEFAULT_DATE_FORMAT = 'dateFormat' as const;
const DEFAULT_DATE_FORMAT_TZ = 'dateFormat:tz' as const;

/**
 * Creates an object to pass to the uiSettings property when creating a KibanaReactContext (see src/plugins/kibana_react/public/context/context.tsx).
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
