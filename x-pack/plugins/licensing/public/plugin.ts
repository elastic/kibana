/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject, Subject, merge, of, timer } from 'rxjs';
import { filter, map, pairwise, switchMap, takeUntil, tap } from 'rxjs/operators';
import {
  CoreSetup,
  CoreStart,
  Plugin as CorePlugin,
  PluginInitializerContext,
} from 'src/core/public';
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
  private stop$ = new Subject();
  private removeInterceptor!: () => void;
  private signature = '';
  public pollingFrequency = DEFAULT_POLLING_FREQUENCY;
  private refresher$ = new BehaviorSubject(true);

  constructor(context: PluginInitializerContext) {}

  private getSession(): ObjectifiedLicense | null {
    const raw = sessionStorage.getItem(LICENSING_SESSION);
    const signature = sessionStorage.getItem(LICENSING_SESSION_SIGNATURE);
    const json = raw && JSON.parse(raw);

    if (signature) {
      this.signature = signature;
    }

    return json;
  }

  private setSession = (license: License) => {
    sessionStorage.setItem(LICENSING_SESSION, JSON.stringify(license.toObject()));

    if (license.signature) {
      sessionStorage.setItem(LICENSING_SESSION_SIGNATURE, license.signature);
    }
  };

  private clearSession() {
    sessionStorage.removeItem(LICENSING_SESSION_SIGNATURE);
    sessionStorage.removeItem(LICENSING_SESSION);
  }

  public sign() {
    return this.signature;
  }

  public setup(core: CoreSetup) {
    const session = this.getSession();
    const initial$ = of(
      session
        ? License.fromObjectified(session, { plugin: this })
        : new License({ plugin: this, features: {} })
    );
    const setup = {
      refresh: () => this.refresher$.next(true),
      license$: initial$,
    };

    this.removeInterceptor = core.http.intercept({
      response: httpResponse => {
        const signature =
          (httpResponse.response && httpResponse.response.headers.get(SIGNATURE_HEADER)) || '';

        if (signature !== this.signature) {
          this.signature = signature;

          if (httpResponse.request && !httpResponse.request.url.includes(API_ROUTE)) {
            setup.refresh();
          }
        }
      },
    });

    const licenseFetches$ = merge(timer(0, this.pollingFrequency), this.refresher$).pipe(
      takeUntil(this.stop$),
      switchMap(async () => {
        try {
          const response = await core.http.get(API_ROUTE);
          const rawLicense = response && response.license;
          const features = (response && response.features) || {};

          return new License({ plugin: this, license: rawLicense, features });
        } catch (err) {
          // Prevent reusing stale license if the fetch operation fails
          this.clearSession();
          return new License({ plugin: this, features: {}, error: err });
        }
      })
    );
    const updates$ = merge(initial$, licenseFetches$).pipe(
      pairwise(),
      filter(([previous, next]) => hasLicenseInfoChanged(previous, next)),
      map(([, next]) => next)
    );

    setup.license$ = merge(initial$, updates$).pipe(
      tap(this.setSession),
      takeUntil(this.stop$)
    );

    return setup;
  }

  public async start(core: CoreStart) {}

  public stop() {
    this.stop$.next();
    this.stop$.complete();

    if (this.removeInterceptor) {
      this.removeInterceptor();
    }
  }
}
