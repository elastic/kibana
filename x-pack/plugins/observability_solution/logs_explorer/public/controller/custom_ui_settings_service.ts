/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { HIDE_ANNOUNCEMENTS, MODIFY_COLUMNS_ON_SWITCH } from '@kbn/discover-utils';
import { createPropertyGetProxy } from '../utils/proxies';

/**
 * Create proxy for the uiSettings service, in which settings preferences are overwritten
 * with custom values
 */
export const createUiSettingsServiceProxy = (uiSettings: IUiSettingsClient) => {
  const overrides: Record<string, any> = {
    [HIDE_ANNOUNCEMENTS]: true,
    [MODIFY_COLUMNS_ON_SWITCH]: false,
  };

  return createPropertyGetProxy(uiSettings, {
    get:
      () =>
      (key, ...args) => {
        if (key in overrides) {
          return overrides[key];
        }

        return uiSettings.get(key, ...args);
      },
  });
};
