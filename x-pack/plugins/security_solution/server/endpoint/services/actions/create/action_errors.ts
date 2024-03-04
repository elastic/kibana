/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicenseType } from '@kbn/licensing-plugin/common/types';
import type { EcsError } from '@elastic/ecs';
import { validateAgents, validateAlertError, validateEndpointLicense } from './validate';
import type { LicenseService } from '../../../../../common/license/license';

export const addErrorsToActionIfAny = ({
  agents,
  licenseService,
  minimumLicenseRequired = 'basic',
  error,
}: {
  agents: string[];
  licenseService: LicenseService;
  minimumLicenseRequired: LicenseType;
  error?: string;
}):
  | {
      error: {
        code: EcsError['code'];
        message: EcsError['message'];
      };
    }
  | undefined => {
  const licenseError = validateEndpointLicense(licenseService, minimumLicenseRequired);
  const agentsError = validateAgents(agents);
  const actionError = validateAlertError(error);
  const alertActionError = licenseError || agentsError || actionError;

  if (alertActionError) {
    return {
      error: {
        code: '400',
        message: alertActionError,
      },
    };
  }
};
