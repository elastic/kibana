/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger } from 'src/core/server';
import {
  IKibanaResponse,
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
} from 'kibana/server';

import { LicensingPluginSetup, LicenseType } from '../../../licensing/server';

export interface LicenseStatus {
  isValid: boolean;
  isSecurityEnabled: boolean;
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
    isSecurityEnabled: false,
    message: 'Invalid License',
  };

  setup(
    { pluginId, minimumLicenseType, defaultErrorMessage }: SetupSettings,
    { licensing, logger }: { licensing: LicensingPluginSetup; logger: Logger }
  ) {
    licensing.license$.subscribe((license) => {
      const { state, message } = license.check(pluginId, minimumLicenseType);
      const hasRequiredLicense = state === 'valid';

      const securityFeature = license.getFeature('security');
      const isSecurityEnabled =
        securityFeature !== undefined &&
        securityFeature.isAvailable === true &&
        securityFeature.isEnabled === true;

      if (hasRequiredLicense) {
        this.licenseStatus = { isValid: true, isSecurityEnabled };
      } else {
        this.licenseStatus = {
          isValid: false,
          isSecurityEnabled,
          message: message || defaultErrorMessage,
        };
        if (message) {
          logger.info(message);
        }
      }
    });
  }

  guardApiRoute(handler: RequestHandler<unknown, unknown, any, any>) {
    const license = this;

    return function licenseCheck(
      ctx: RequestHandlerContext,
      request: KibanaRequest,
      response: KibanaResponseFactory
    ): IKibanaResponse<any> | Promise<IKibanaResponse<any>> {
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
}
