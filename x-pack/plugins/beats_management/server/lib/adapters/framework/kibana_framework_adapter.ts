/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { isLeft } from 'fp-ts/lib/Either';
import { KibanaRequest, Headers, Logger } from 'src/core/server';
import {
  BackendFrameworkAdapter,
  FrameworkInfo,
  FrameworkUser,
  internalAuthData,
  internalUser,
  RuntimeFrameworkInfo,
  RuntimeKibanaUser,
} from './adapter_types';
import { BeatsManagementConfigType } from '../../../../common';
import { ILicense, LicensingPluginStart } from '../../../../../licensing/server';
import { SecurityPluginSetup } from '../../../../../security/server';

export class KibanaBackendFrameworkAdapter implements BackendFrameworkAdapter {
  public readonly internalUser = internalUser;
  public info: null | FrameworkInfo = null;

  constructor(
    private readonly PLUGIN_ID: string,
    private readonly kibanaVersion: string,
    private readonly config: BeatsManagementConfigType,
    private readonly logger: Logger,
    private readonly licensing: LicensingPluginStart,
    private readonly security?: SecurityPluginSetup
  ) {
    this.licensing.license$.subscribe((license) => this.licenseUpdateHandler(license));
  }

  public log(text: string) {
    this.logger.info(text);
  }

  getUser(request: KibanaRequest): FrameworkUser<Headers> {
    const user = this.security?.authc.getCurrentUser(request);
    if (!user) {
      return {
        kind: 'unauthenticated',
      };
    }
    const assertKibanaUser = RuntimeKibanaUser.decode(user);
    if (isLeft(assertKibanaUser)) {
      throw new Error(
        `Error parsing user info in ${this.PLUGIN_ID},   ${
          PathReporter.report(assertKibanaUser)[0]
        }`
      );
    }

    return {
      kind: 'authenticated',
      [internalAuthData]: request.headers,
      ...user,
    };
  }

  private licenseUpdateHandler = (license: ILicense) => {
    let xpackInfoUnpacked: FrameworkInfo;

    // If, for some reason, we cannot get the license information
    // from Elasticsearch, assume worst case and disable
    if (!license.isAvailable) {
      this.info = null;
      return;
    }

    const securityFeature = license.getFeature('security');
    const watcherFeature = license.getFeature('watcher');

    try {
      xpackInfoUnpacked = {
        kibana: {
          version: this.kibanaVersion,
        },
        license: {
          type: license.type!,
          expired: !license.isActive,
          expiry_date_in_millis: license.expiryDateInMillis ?? -1,
        },
        security: {
          enabled: securityFeature.isEnabled,
          available: securityFeature.isAvailable,
        },
        watcher: {
          enabled: watcherFeature.isEnabled,
          available: watcherFeature.isAvailable,
        },
      };
    } catch (e) {
      this.logger.error(`Error accessing required xPackInfo in ${this.PLUGIN_ID} Kibana adapter`);
      throw e;
    }

    const assertData = RuntimeFrameworkInfo.decode(xpackInfoUnpacked);
    if (isLeft(assertData)) {
      throw new Error(
        `Error parsing xpack info in ${this.PLUGIN_ID},   ${PathReporter.report(assertData)[0]}`
      );
    }
    this.info = xpackInfoUnpacked;

    return {
      security: xpackInfoUnpacked.security,
      settings: { ...this.config },
    };
  };
}
