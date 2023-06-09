/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Headers, IUiSettingsClient } from '@kbn/core/server';
import { UI_SETTINGS_CUSTOM_PDF_LOGO } from '@kbn/reporting-common';

export const getCustomLogo = async (uiSettingsClient: IUiSettingsClient, headers: Headers) => {
  const logo: string = await uiSettingsClient.get(UI_SETTINGS_CUSTOM_PDF_LOGO);

  // continue the pipeline
  return { headers, logo };
};
