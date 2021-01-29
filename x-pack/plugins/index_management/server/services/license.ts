/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger } from 'src/core/server';
import type { KibanaRequest, KibanaResponseFactory, RequestHandler } from 'kibana/server';

import { LicensingPluginSetup } from '../../../licensing/server';
import { LicenseType } from '../../../licensing/common/types';
import type { IndexManagementRequestHandlerContext } from '../types';

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

  setup(
    { pluginId, minimumLicenseType, defaultErrorMessage }: SetupSettings,
    { licensing, logger }: { licensing: LicensingPluginSetup; logger: Logger }
  ) {
    licensing.license$.subscribe((license) => {
      const { state, message } = license.check(pluginId, minimumLicenseType);
      const hasRequiredLicense = state === 'valid';

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

  guardApiRoute<P, Q, B, Context extends IndexManagementRequestHandlerContext>(
    handler: RequestHandler<P, Q, B, Context>
  ) {
    const license = this;

    return function licenseCheck(
      ctx: Context,
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
}
