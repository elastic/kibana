/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  policyFactory as policyConfigFactory,
  policyFactoryWithoutPaidFeatures as policyConfigFactoryWithoutPaidFeatures,
} from '../../../common/endpoint/models/policy_config';
import type { LicenseService } from '../../../common/license/license';
import { isAtLeast } from '../../../common/license/license';
import type { PolicyConfig } from '../../../common/endpoint/types';

/**
 * Create the default endpoint policy based on the current license
 */
export const createDefaultPolicy = (licenseService: LicenseService): PolicyConfig => {
  return isAtLeast(licenseService.getLicenseInformation(), 'platinum')
    ? policyConfigFactory()
    : policyConfigFactoryWithoutPaidFeatures();
};
