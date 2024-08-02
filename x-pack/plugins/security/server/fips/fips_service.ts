/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { SecurityLicense } from '@kbn/security-plugin-types-common';

import type { ConfigType } from '../config';

export interface FipsServiceSetupParams {
  config: ConfigType;
  license: SecurityLicense;
}

export interface FipsServiceSetupInternal {
  validateLicenseForFips: () => void;
}

export class FipsService {
  private readonly logger: Logger;
  private isInitialLicenseLoaded: boolean;

  constructor(logger: Logger) {
    this.logger = logger;
    this.isInitialLicenseLoaded = false;
  }

  setup({ config, license }: FipsServiceSetupParams): FipsServiceSetupInternal {
    return {
      validateLicenseForFips: () => this.validateLicenseForFips(config, license),
    };
  }

  private validateLicenseForFips(config: ConfigType, license: SecurityLicense) {
    license.features$.subscribe({
      next: (features) => {
        const errorMessage = `Your current license level is ${license.getLicenseType()} and does not support running in FIPS mode.`;

        if (license.isLicenseAvailable() && !this.isInitialLicenseLoaded) {
          if (config?.experimental.fipsMode.enabled && !license.getFeatures().allowFips) {
            this.logger.error(errorMessage);
            throw new Error(errorMessage);
          }

          this.isInitialLicenseLoaded = true;
        }

        if (
          this.isInitialLicenseLoaded &&
          license.isLicenseAvailable() &&
          config?.experimental.fipsMode.enabled &&
          !features.allowFips
        ) {
          this.logger.error(
            `${errorMessage} Kibana will not be able to restart. Please upgrade your license to platinum or higher.`
          );
        }
      },
      error: (error) => {
        this.logger.debug(`Unable to check license: ${error}`);
      },
    });
  }
}
