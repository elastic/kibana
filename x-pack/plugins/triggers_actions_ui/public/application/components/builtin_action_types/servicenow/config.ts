/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as i18n from './translations';
import logo from './logo.svg';

export const serviceNowITSMConfiguration = {
  id: '.servicenow',
  name: i18n.SERVICENOW_ITSM_TITLE,
  desc: i18n.SERVICENOW_ITSM_DESC,
  logo,
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'platinum',
};

export const serviceNowSIRConfiguration = {
  id: '.servicenow-sir',
  name: i18n.SERVICENOW_SIR_TITLE,
  desc: i18n.SERVICENOW_SIR_DESC,
  logo,
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'platinum',
};
