/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UI_SETTINGS_CUSTOM_PDF_LOGO } from '@kbn/reporting-common';
import { Headers, Logger } from '@kbn/core/server';
import { LogoCore } from './types';

export const getCustomLogo = async (
  reporting: LogoCore,
  headers: Headers,
  spaceId: string | undefined,
  logger: Logger
) => {
  const fakeRequest = reporting.getFakeRequest(headers, spaceId, logger);
  const uiSettingsClient = await reporting.getUiSettingsClient(fakeRequest, logger);
  const logo: string = await uiSettingsClient.get(UI_SETTINGS_CUSTOM_PDF_LOGO);

  // continue the pipeline
  return { headers, logo };
};
