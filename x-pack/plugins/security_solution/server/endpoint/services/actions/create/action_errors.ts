/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicenseType } from '@kbn/licensing-plugin/common/types';
import type { EcsError } from '@kbn/ecs';
import { validateAgents, validateEndpointLicense } from './validate';
import type { LicenseService } from '../../../../../common/license/license';

export const addErrorsToActionIfAny = ({
  agents,
  licenseService,
  minimumLicenseRequired = 'basic',
}: {
  agents: string[];
  licenseService: LicenseService;
  minimumLicenseRequired: LicenseType;
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
  const alertActionError = licenseError || agentsError;

  if (alertActionError) {
    return {
      error: {
        code: '400',
        message: alertActionError,
      },
    };
  }
};
