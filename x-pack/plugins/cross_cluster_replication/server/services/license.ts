/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Logger } from 'src/core/server';
import { KibanaRequest, KibanaResponseFactory, RequestHandler } from 'src/core/server';

import type { LicenseType, LicenseCheckState } from '../../../licensing/common/types';
import type { CcrRequestHandlerContext } from '../types';

import { LicensingPluginSetup } from '../../../licensing/server';
import { PLUGIN } from '../../common/constants';

interface SetupSettings {
  pluginId: string;
  minimumLicenseType: LicenseType;
}

export class License {
  private licenseCheckState: LicenseCheckState = 'unavailable';
  private licenseType?: LicenseType;
  private logger?: Logger;

  private _isEsSecurityEnabled: boolean = false;

  setup(
    { pluginId, minimumLicenseType }: SetupSettings,
    { licensing, logger }: { licensing: LicensingPluginSetup; logger: Logger }
  ) {
    this.logger = logger;

    licensing.license$.subscribe((license) => {
      this.licenseType = license.type;
      this.licenseCheckState = license.check(pluginId, minimumLicenseType).state;

      // Retrieving security checks the results of GET /_xpack as well as license state,
      // so we're also checking whether the security is disabled in elasticsearch.yml.
      this._isEsSecurityEnabled = license.getFeature('security').isEnabled;
    });
  }

  getLicenseErrorMessage(licenseCheckState: LicenseCheckState): string {
    switch (licenseCheckState) {
      case 'invalid':
        return i18n.translate(
          'xpack.crossClusterReplication.licensingCheck.errorUnsupportedMessage',
          {
            defaultMessage:
              'Your {licenseType} license does not support {pluginName}. Please upgrade your license.',
            values: { licenseType: this.licenseType!, pluginName: PLUGIN.TITLE },
          }
        );

      case 'expired':
        return i18n.translate('xpack.crossClusterReplication.licensingCheck.errorExpiredMessage', {
          defaultMessage:
            'You cannot use {pluginName} because your {licenseType} license has expired.',
          values: { licenseType: this.licenseType!, pluginName: PLUGIN.TITLE },
        });

      case 'unavailable':
        return i18n.translate(
          'xpack.crossClusterReplication.licensingCheck.errorUnavailableMessage',
          {
            defaultMessage:
              'You cannot use {pluginName} because license information is not available at this time.',
            values: { pluginName: PLUGIN.TITLE },
          }
        );
    }

    return i18n.translate('xpack.crossClusterReplication.licensingCheck.genericErrorMessage', {
      defaultMessage: 'You cannot use {pluginName} because the license check failed.',
      values: { pluginName: PLUGIN.TITLE },
    });
  }

  guardApiRoute<P, Q, B>(handler: RequestHandler<P, Q, B, CcrRequestHandlerContext>) {
    const licenseCheck = (
      ctx: CcrRequestHandlerContext,
      request: KibanaRequest<P, Q, B>,
      response: KibanaResponseFactory
    ) => {
      // We'll only surface license errors if users attempt disallowed access to the API.
      if (this.licenseCheckState !== 'valid') {
        const licenseErrorMessage = this.getLicenseErrorMessage(this.licenseCheckState);
        this.logger?.warn(licenseErrorMessage);

        return response.customError({
          body: {
            message: licenseErrorMessage,
          },
          statusCode: 403,
        });
      }

      return handler(ctx, request, response);
    };

    return licenseCheck;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
  get isEsSecurityEnabled() {
    return this._isEsSecurityEnabled;
  }
}
