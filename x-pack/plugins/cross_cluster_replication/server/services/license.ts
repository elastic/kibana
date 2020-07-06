/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger } from 'src/core/server';
import {
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
} from 'src/core/server';

import { LicensingPluginSetup } from '../../../licensing/server';
import { LicenseType } from '../../../licensing/common/types';

export interface LicenseStatus {
  isValid: boolean;
  message?: string;
}

interface SetupSettings {
  pluginId: string;
  minimumLicenseType: LicenseType;
  defaultErrorMessage: string;
}

export class License {
  private licenseStatus: LicenseStatus = {
    isValid: false,
    message: 'Invalid License',
  };

  private _isEsSecurityEnabled: boolean = false;

  setup(
    { pluginId, minimumLicenseType, defaultErrorMessage }: SetupSettings,
    { licensing, logger }: { licensing: LicensingPluginSetup; logger: Logger }
  ) {
    licensing.license$.subscribe((license) => {
      const { state, message } = license.check(pluginId, minimumLicenseType);
      const hasRequiredLicense = state === 'valid';

      // Retrieving security checks the results of GET /_xpack as well as license state,
      // so we're also checking whether the security is disabled in elasticsearch.yml.
      this._isEsSecurityEnabled = license.getFeature('security').isEnabled;

      if (hasRequiredLicense) {
        this.licenseStatus = { isValid: true };
      } else {
        this.licenseStatus = {
          isValid: false,
          message: message || defaultErrorMessage,
        };
        if (message) {
          logger.info(message);
        }
      }
    });
  }

  guardApiRoute<P, Q, B>(handler: RequestHandler<P, Q, B>) {
    const license = this;

    return function licenseCheck(
      ctx: RequestHandlerContext,
      request: KibanaRequest<P, Q, B>,
      response: KibanaResponseFactory
    ) {
      const licenseStatus = license.getStatus();

      if (!licenseStatus.isValid) {
        return response.customError({
          body: {
            message: licenseStatus.message || '',
          },
          statusCode: 403,
        });
      }

      return handler(ctx, request, response);
    };
  }

  getStatus() {
    return this.licenseStatus;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
  get isEsSecurityEnabled() {
    return this._isEsSecurityEnabled;
  }
}
