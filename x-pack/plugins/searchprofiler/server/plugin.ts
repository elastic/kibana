/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, Logger, Plugin, PluginInitializerContext } from 'kibana/server';

import { LICENSE_CHECK_STATE } from '../../licensing/common/types';

import { LicenseStatus } from '../common/types';
import { AppServerPluginDependencies } from './types';
import * as profileRoute from './routes/profile';
import { PLUGIN } from '../common/constants';

export class SearchProfilerServerPlugin implements Plugin {
  licenseStatus: LicenseStatus;
  log: Logger;

  constructor({ logger }: PluginInitializerContext) {
    this.log = logger.get();
    this.licenseStatus = { valid: false };
  }

  async setup({ http }: CoreSetup, { licensing, elasticsearch }: AppServerPluginDependencies) {
    const router = http.createRouter();
    profileRoute.register({ elasticsearch, router, getLicenseStatus: () => this.licenseStatus });

    licensing.license$.subscribe(license => {
      const { state, message } = license.check(PLUGIN.id, PLUGIN.minimumLicenseType);
      const hasRequiredLicense = state === LICENSE_CHECK_STATE.Valid;
      if (hasRequiredLicense && license.getFeature(PLUGIN.id).isAvailable) {
        this.licenseStatus = { valid: true };
      } else {
        this.licenseStatus = {
          valid: false,
          message,
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
