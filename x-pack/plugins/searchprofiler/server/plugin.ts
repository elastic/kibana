/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';

import { LicenseStatus, PLUGIN } from '../common';
import { AppServerPluginDependencies } from './types';
import * as profileRoute from './routes/profile';

export class SearchProfilerServerPlugin implements Plugin {
  licenseStatus: LicenseStatus;
  log: Logger;

  constructor({ logger }: PluginInitializerContext) {
    this.log = logger.get();
    this.licenseStatus = { valid: false };
  }

  setup({ http }: CoreSetup, { licensing }: AppServerPluginDependencies) {
    const router = http.createRouter();
    profileRoute.register({
      router,
      getLicenseStatus: () => this.licenseStatus,
      log: this.log,
    });

    licensing.license$.subscribe((license) => {
      const { state, message } = license.check(PLUGIN.id, PLUGIN.minimumLicenseType);
      const hasRequiredLicense = state === 'valid';
      if (hasRequiredLicense) {
        this.licenseStatus = { valid: true };
      } else {
        this.licenseStatus = {
          valid: false,
          message:
            message ||
            // Ensure that there is a message when license check fails
            i18n.translate('xpack.searchProfiler.licenseCheckErrorMessage', {
              defaultMessage: 'License check failed',
            }),
        };
        if (message) {
          this.log.info(message);
        }
      }
    });
  }

  start() {}

  stop() {}
}
