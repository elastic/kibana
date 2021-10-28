/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportingCore } from '../../';
import { UI_SETTINGS_CUSTOM_PDF_LOGO } from '../../../common/constants';
import { LevelLogger } from '../../lib';
import { ConditionalHeaders } from '../common';

export const getCustomLogo = async (
  reporting: ReportingCore,
  conditionalHeaders: ConditionalHeaders,
  spaceId: string | undefined,
  logger: LevelLogger
) => {
  const fakeRequest = reporting.getFakeRequest(
    { headers: conditionalHeaders.headers },
    spaceId,
    logger
  );
  const uiSettingsClient = await reporting.getUiSettingsClient(fakeRequest, logger);
  const logo: string = await uiSettingsClient.get(UI_SETTINGS_CUSTOM_PDF_LOGO);

  // continue the pipeline
  return { conditionalHeaders, logo };
};
