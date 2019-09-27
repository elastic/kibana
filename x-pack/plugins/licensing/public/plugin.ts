/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CoreSetup,
  CoreStart,
  Plugin as CorePlugin,
  PluginInitializerContext,
} from 'src/core/public';
import { Poller } from '../../../../src/core/utils/poller';
import { LicensingPluginSetup, ILicensingPlugin, ObjectifiedLicense } from '../common/types';
import {
  API_ROUTE,
  LICENSING_SESSION,
  LICENSING_SESSION_SIGNATURE,
  SIGNATURE_HEADER,
  DEFAULT_POLLING_FREQUENCY,
} from '../common/constants';
import { License } from '../common/license';
import { hasLicenseInfoChanged } from '../common/has_license_info_changed';

export class Plugin implements CorePlugin<LicensingPluginSetup>, ILicensingPlugin {
  private http!: CoreSetup['http'];
  private poller!: Poller<License>;
  private refresher?: Promise<void>;
  private removeInterceptor!: () => void;
  private signature = '';
  public pollingFrequency = DEFAULT_POLLING_FREQUENCY;

  constructor(context: PluginInitializerContext) {}

  private getSession() {
    const raw = sessionStorage.getItem(LICENSING_SESSION);
    const signature = sessionStorage.getItem(LICENSING_SESSION_SIGNATURE);
    const json = raw ? JSON.parse(raw) : {};

    if (signature) {
      this.signature = signature;
    }

    return json;
  }

  private setSession(license: ObjectifiedLicense, signature?: string) {
    sessionStorage.setItem(LICENSING_SESSION, JSON.stringify(license));

    if (signature) {
      sessionStorage.setItem(LICENSING_SESSION_SIGNATURE, signature);
    }
  }

  private clearSession() {
    sessionStorage.removeItem(LICENSING_SESSION_SIGNATURE);
    sessionStorage.removeItem(LICENSING_SESSION);
  }

  private async next() {
    try {
      const response = await this.http.get(API_ROUTE);
      const rawLicense = response && response.license;
      const features = (response && response.features) || {};
      const currentLicense = this.poller.subject$.getValue();
      const licenseInfoChanged = hasLicenseInfoChanged(currentLicense, rawLicense);

      if (licenseInfoChanged) {
        this.setSession({ license: rawLicense, features });
        return new License({ plugin: this, license: rawLicense, features });
      }
    } catch (err) {
      // Prevent reusing stale license if the fetch operation fails
      this.clearSession();
      return new License({ plugin: this, features: {}, error: err });
    }
  }

  public async refresh() {
    if (this.refresher) {
      return this.refresher;
    }

    this.refresher = new Promise(async resolve => {
      const license = await this.next();

      if (license) {
        this.poller.subject$.next(license);
      }

      this.refresher = undefined;
      resolve();
    });
  }

  private intercept() {
    this.removeInterceptor = this.http.intercept({
      response: httpResponse => {
        const signature = httpResponse.response!.headers.get(SIGNATURE_HEADER) || '';

        if (signature !== this.signature) {
          this.signature = signature;

          if (!httpResponse.request!.url.includes(API_ROUTE)) {
            this.refresh();
          }
        }
      },
    });
  }

  public sign() {
    return this.signature;
  }

  public async setup(core: CoreSetup) {
    const { license, features = {} } = this.getSession();
    const initialLicense = new License({ plugin: this, license, features });

    this.http = core.http;
    this.intercept();
    this.poller = new Poller<License>(this.pollingFrequency, initialLicense, () => this.next());

    return {
      license$: this.poller.subject$.asObservable(),
    };
  }

  public async start(core: CoreStart) {}

  public stop() {
    if (this.removeInterceptor) {
      this.removeInterceptor();
    }
  }
}
