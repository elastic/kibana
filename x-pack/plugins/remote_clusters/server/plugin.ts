/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

import { CoreSetup, Logger, Plugin, PluginInitializerContext } from 'src/core/server';
import { Observable } from 'rxjs';
import { LICENSE_CHECK_STATE } from '../../licensing/common/types';

import { PLUGIN } from '../common/constants';
import { Dependencies, LicenseStatus, RouteDependencies } from './types';
import { ConfigType } from './config';
import {
  registerGetRoute,
  registerAddRoute,
  registerUpdateRoute,
  registerDeleteRoute,
} from './routes/api';

export class RemoteClustersServerPlugin implements Plugin<void, void, any, any> {
  licenseStatus: LicenseStatus;
  log: Logger;
  config: Observable<ConfigType>;

  constructor({ logger, config }: PluginInitializerContext) {
    this.log = logger.get();
    this.config = config.create();
    this.licenseStatus = { valid: false };
  }

  async setup(
    { http, elasticsearch: elasticsearchService }: CoreSetup,
    { licensing }: Dependencies
  ) {
    const elasticsearch = await elasticsearchService.adminClient;
    const router = http.createRouter();
    const routeDependencies: RouteDependencies = {
      elasticsearch,
      elasticsearchService,
      router,
      getLicenseStatus: () => this.licenseStatus,
    };

    // Register routes
    registerGetRoute(routeDependencies);
    registerAddRoute(routeDependencies);
    registerUpdateRoute(routeDependencies);
    registerDeleteRoute(routeDependencies);

    licensing.license$.subscribe(license => {
      const { state, message } = license.check(PLUGIN.id, PLUGIN.minimumLicenseType);
      const hasRequiredLicense = state === LICENSE_CHECK_STATE.Valid;
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
  }

  start() {}

  stop() {}
}
