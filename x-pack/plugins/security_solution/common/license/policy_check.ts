/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LicenseService } from './license';
import { PolicyConfig } from '../endpoint/types';

/**
 * Given an endpoint package policy, verifies that all enabled features that
 * require a certain license level have a valid license for them.
 */
export const isEndpointPolicyValidForLicense = (
  policy: PolicyConfig,
  license: LicenseService
): boolean => {
  if (license.isPlatinumPlus()) {
    return true; // currently, platinum allows all features
  }

  // only platinum or higher may disable malware notification
  if (
    policy.windows.popup.malware.enabled === false ||
    policy.mac.popup.malware.enabled === false
  ) {
    return false;
  }

  // todo: should/can this value be imported if the default ever changes?
  // should this check against policy_config::factory?
  const defaultMalwareNotificationMessage = 'Elastic Security { action } { filename }';

  if (
    policy.windows.popup.malware.message !== defaultMalwareNotificationMessage ||
    policy.mac.popup.malware.message !== defaultMalwareNotificationMessage
  ) {
    return false;
  }

  return true;
};
