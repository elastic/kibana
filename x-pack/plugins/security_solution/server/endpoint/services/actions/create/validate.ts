/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LicenseType } from '@kbn/licensing-plugin/server';
import type { LicenseService } from '../../../../../common/license';

export const validateEndpointLicense = (license: LicenseService, licenseType: LicenseType) => {
  const hasEnterpriseLicense = license.isAtLeast(licenseType);

  if (!hasEnterpriseLicense) {
    return LICENSE_TOO_LOW;
  }
};

export const validateAgents = (agents: string[]) => {
  if (!agents.length) {
    return HOST_NOT_ENROLLED;
  }
};

export const LICENSE_TOO_LOW = i18n.translate(
  'xpack.securitySolution.responseActionsList.error.licenseTooLow',
  {
    defaultMessage: 'At least Enterprise license is required to use Response Actions.',
  }
);

export const HOST_NOT_ENROLLED = i18n.translate(
  'xpack.securitySolution.responseActionsList.error.hostNotEnrolled',
  {
    defaultMessage: 'The host does not have Elastic Defend integration installed',
  }
);
