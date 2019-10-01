/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject, merge, of, timer } from 'rxjs';
import { filter, map, pairwise, switchMap, tap } from 'rxjs/operators';
import {
  CoreSetup,
  CoreStart,
  Plugin as CorePlugin,
  PluginInitializerContext,
} from 'src/core/public';
import { LicensingPluginSetup, ILicensingPlugin } from '../common/types';
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

  private setSession(license: License) {
    sessionStorage.setItem(LICENSING_SESSION, JSON.stringify(license.toObject()));

    if (license.signature) {
      sessionStorage.setItem(LICENSING_SESSION_SIGNATURE, license.signature);
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

      return new License({ plugin: this, license: rawLicense, features });
    } catch (err) {
      // Prevent reusing stale license if the fetch operation fails
      this.clearSession();
      return new License({ plugin: this, features: {}, error: err });
    }
  }

  private intercept(manual$: BehaviorSubject<boolean>) {
    this.removeInterceptor = this.http.intercept({
      response: httpResponse => {
        const signature = httpResponse.response!.headers.get(SIGNATURE_HEADER) || '';

        if (signature !== this.signature) {
          this.signature = signature;

          if (!httpResponse.request!.url.includes(API_ROUTE)) {
            manual$.next(true);
          }
        }
      },
    });
  }

  public sign() {
    return this.signature;
  }

  public setup(core: CoreSetup) {
    this.http = core.http;

    const { license, features = {} } = this.getSession();
    const manual$ = new BehaviorSubject<boolean>(true);
    const initialLicense = new License({ plugin: this, license, features });

    this.intercept(manual$);

    const license$ = merge(of(initialLicense), timer(0, this.pollingFrequency), manual$).pipe(
      switchMap(() => this.next()),
      pairwise(),
      filter(([previous, next]) => hasLicenseInfoChanged(previous, next)),
      tap(([, next]) => this.setSession(next)),
      map(([, next]) => next)
    );

    return {
      license$,
      refresh() {
        manual$.next(true);
      },
    };
  }

  public async start(core: CoreStart) {}

  public stop() {
    if (this.removeInterceptor) {
      this.removeInterceptor();
    }
  }
}
