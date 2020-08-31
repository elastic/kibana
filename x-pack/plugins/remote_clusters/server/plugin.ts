/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

import { CoreSetup, Logger, Plugin, PluginInitializerContext } from 'src/core/server';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';

import { PLUGIN } from '../common/constants';
import { Dependencies, LicenseStatus, RouteDependencies } from './types';
import { ConfigType } from './config';
import {
  registerGetRoute,
  registerAddRoute,
  registerUpdateRoute,
  registerDeleteRoute,
} from './routes/api';

export interface RemoteClustersPluginSetup {
  isUiEnabled: boolean;
}

export class RemoteClustersServerPlugin
  implements Plugin<RemoteClustersPluginSetup, void, any, any> {
  licenseStatus: LicenseStatus;
  log: Logger;
  config$: Observable<ConfigType>;

  constructor({ logger, config }: PluginInitializerContext) {
    this.log = logger.get();
    this.config$ = config.create();
    this.licenseStatus = { valid: false };
  }

  async setup({ http }: CoreSetup, { licensing, cloud }: Dependencies) {
    const router = http.createRouter();
    const config = await this.config$.pipe(first()).toPromise();

    const routeDependencies: RouteDependencies = {
      router,
      getLicenseStatus: () => this.licenseStatus,
      config: {
        isCloudEnabled: Boolean(cloud?.isCloudEnabled),
      },
    };

    // Register routes
    registerGetRoute(routeDependencies);
    registerAddRoute(routeDependencies);
    registerUpdateRoute(routeDependencies);
    registerDeleteRoute(routeDependencies);

    licensing.license$.subscribe((license) => {
      const { state, message } = license.check(PLUGIN.getI18nName(), PLUGIN.minimumLicenseType);
      const hasRequiredLicense = state === 'valid';
      if (hasRequiredLicense) {
        this.licenseStatus = { valid: true };
      } else {
        this.licenseStatus = {
          valid: false,
          message:
            message ||
            i18n.translate('xpack.remoteClusters.licenseCheckErrorMessage', {
              defaultMessage: 'License check failed',
            }),
        };
        if (message) {
          this.log.info(message);
        }
      }
    });

    return {
      isUiEnabled: config.ui.enabled,
    };
  }

  start() {}

  stop() {}
}
