/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';

import type { ILicense } from '@kbn/licensing-plugin/server';
import type { Logger } from '@kbn/logging';
import type { SecurityLicense } from '@kbn/security-plugin-types-common';

import type { ConfigType } from '../config';

export interface FipsServiceSetupParams {
  config: ConfigType;
  license: SecurityLicense;
}

export interface FipsServiceStartParams {
  license$: Observable<ILicense>;
}

export interface FipsServiceSetupInternal {
  canStartInFipsMode: () => void;
}

export interface FipsServiceStartInternal {
  monitorForLicenseDowngradeToLogFipsRestartError: () => void;
}

export class FipsService {
  private readonly logger: Logger;
  private license: SecurityLicense | undefined;
  private config: ConfigType | undefined;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  setup({ config, license }: FipsServiceSetupParams): FipsServiceSetupInternal {
    this.license = license;
    this.config = config;

    return { canStartInFipsMode: () => this.canStartInFipsMode() };
  }

  start({ license$ }: FipsServiceStartParams): FipsServiceStartInternal {
    return {
      monitorForLicenseDowngradeToLogFipsRestartError: () =>
        this.monitorForLicenseDowngradeToLogFipsRestartError(license$),
    };
  }

  private monitorForLicenseDowngradeToLogFipsRestartError(license$: Observable<ILicense>) {
    license$.subscribe({
      next: (license) => {
        if (license.isAvailable && this.isRunningInFipsModeWithUnsupportedLicense()) {
          this.logger.fatal(
            `Your current license level is ${license.type} and does not support running in FIPS mode, Kibana will not be able to restart. Please upgrade your license to Platinum or higher.`
          );
        }
      },
      error: (error) => {
        this.logger.debug(`Unable to check license: ${error}`);
      },
    });
  }

  private canStartInFipsMode() {
    if (this.isRunningInFipsModeWithUnsupportedLicense()) {
      this.logger.fatal('Current license level does not support running in FIPS mode');
      throw new Error('Current license level does not support running in FIPS mode');
    }
  }

  private isRunningInFipsModeWithUnsupportedLicense(): boolean {
    const isLicenseCompatibleWithFips = this.license?.getFeatures().allowFips || false;
    const isConfiguredToRunInFipsMode = this.config?.fipsMode.enabled || false;

    return !isLicenseCompatibleWithFips && isConfiguredToRunInFipsMode;
  }
}
