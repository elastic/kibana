/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReportingCore } from '../../../';
import { UI_SETTINGS_CUSTOM_PDF_LOGO } from '../../../../common/constants';
import { ConditionalHeaders } from '../../common';

export const getCustomLogo = async (
  reporting: ReportingCore,
  conditionalHeaders: ConditionalHeaders,
  spaceId?: string
) => {
  const fakeRequest = reporting.getFakeRequest({ headers: conditionalHeaders.headers }, spaceId);
  const uiSettingsClient = await reporting.getUiSettingsClient(fakeRequest);

  const logo: string = await uiSettingsClient.get(UI_SETTINGS_CUSTOM_PDF_LOGO);

  // continue the pipeline
  return { conditionalHeaders, logo };
};
