/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { UI_SETTINGS } from '../hooks/use_kibana_ui_settings';

export function getTimeZone(uiSettings?: IUiSettingsClient) {
  const kibanaTimeZone = uiSettings?.get<'Browser' | string>(UI_SETTINGS.DATEFORMAT_TZ);

  if (!kibanaTimeZone || kibanaTimeZone === 'Browser') {
    return 'local';
  }

  return kibanaTimeZone;
}
