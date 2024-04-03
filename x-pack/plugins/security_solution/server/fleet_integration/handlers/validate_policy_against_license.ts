/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { capitalize } from 'lodash';
import { isEndpointPolicyValidForLicense } from '../../../common/license/policy_config';
import type { PolicyConfig } from '../../../common/endpoint/types';
import type { LicenseService } from '../../../common/license';

export const validatePolicyAgainstLicense = (
  policyConfig: PolicyConfig,
  licenseService: LicenseService,
  logger: Logger
): void => {
  const licenseInformation = licenseService.getLicenseInformation();
  if (!isEndpointPolicyValidForLicense(policyConfig, licenseInformation)) {
    logger.warn('Incorrect license tier for paid policy fields');
    // The `statusCode` below is used by Fleet API handler to ensure that the proper HTTP code is used in the API response
    const licenseError: Error & { statusCode?: number; passThroughApi?: boolean } = new Error(
      `${capitalize(
        licenseInformation?.type || 'current'
      )} license does not support this action. Please upgrade your license.`
    );
    licenseError.statusCode = 403;
    licenseError.passThroughApi = true;

    throw licenseError;
  }
};
