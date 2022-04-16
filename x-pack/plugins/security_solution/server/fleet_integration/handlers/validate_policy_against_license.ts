/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { isEndpointPolicyValidForLicense } from '../../../common/license/policy_config';
import { PolicyConfig } from '../../../common/endpoint/types';
import { LicenseService } from '../../../common/license';

export const validatePolicyAgainstLicense = (
  policyConfig: PolicyConfig,
  licenseService: LicenseService,
  logger: Logger
): void => {
  if (!isEndpointPolicyValidForLicense(policyConfig, licenseService.getLicenseInformation())) {
    logger.warn('Incorrect license tier for paid policy fields');
    // The `statusCode` below is used by Fleet API handler to ensure that the proper HTTP code is used in the API response
    const licenseError: Error & { statusCode?: number } = new Error('Requires Platinum license');
    licenseError.statusCode = 403;
    throw licenseError;
  }
};
