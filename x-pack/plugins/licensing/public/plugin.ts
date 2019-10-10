/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject, Subject, defer, merge, of, timer } from 'rxjs';
import { filter, map, pairwise, repeatWhen, switchMap, takeUntil, tap } from 'rxjs/operators';
import {
  CoreSetup,
  CoreStart,
  Plugin as CorePlugin,
  PluginInitializerContext,
} from 'src/core/public';
import { LicensingPluginSetup, ObjectifiedLicense } from '../common/types';
import {
  API_ROUTE,
  LICENSING_SESSION,
  LICENSING_SESSION_SIGNATURE,
  SIGNATURE_HEADER,
  DEFAULT_POLLING_FREQUENCY,
} from '../common/constants';
import { License } from '../common/license';
import { hasLicenseInfoChanged } from '../common/has_license_info_changed';

function sign(serialized: string) {
  return sign.signature;
}
sign.signature = '';

export class Plugin implements CorePlugin<LicensingPluginSetup> {
  private stop$ = new Subject();
  private removeInterceptor!: () => void;
  public pollingFrequency = DEFAULT_POLLING_FREQUENCY;
  private refresher$ = new BehaviorSubject(true);

  constructor(context: PluginInitializerContext) {}

  private getSession(): ObjectifiedLicense | null {
    const raw = sessionStorage.getItem(LICENSING_SESSION);
    const signature = sessionStorage.getItem(LICENSING_SESSION_SIGNATURE);
    const json = raw && JSON.parse(raw);

    if (signature) {
      sign.signature = signature;
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
    sessionStorage.removeItem(LICENSING_SESSION);
    sessionStorage.removeItem(LICENSING_SESSION_SIGNATURE);
  }

  public setup(core: CoreSetup) {
    const session = this.getSession();
    const initial$ = of(
      session ? License.fromObjectified(session, { sign }) : new License({ sign, features: {} })
    );
    const setup = {
      refresh: () => this.refresher$.next(true),
      license$: initial$,
    };

    this.removeInterceptor = core.http.intercept({
      response: httpResponse => {
        const signature =
          (httpResponse.response && httpResponse.response.headers.get(SIGNATURE_HEADER)) || '';

        if (signature !== sign.signature) {
          sign.signature = signature;

          if (httpResponse.request && !httpResponse.request.url.includes(API_ROUTE)) {
            setup.refresh();
          }
        }
      },
    });

    // The license fetches occur in a defer/repeatWhen pair to avoid race conditions between refreshes and timers
    const licenseFetches$ = defer(async () => {
      try {
        const response = await core.http.get(API_ROUTE);
        const rawLicense = response && response.license;
        const features = (response && response.features) || {};

        return new License({ sign, license: rawLicense, features });
      } catch (err) {
        // Prevent reusing stale license if the fetch operation fails
        this.clearSession();
        return new License({ sign, features: {}, error: err });
      }
    }).pipe(
      repeatWhen(complete$ => complete$.pipe(switchMap(() => timer(0, this.pollingFrequency))))
    );
    const updates$ = merge(initial$, licenseFetches$).pipe(
      takeUntil(this.stop$),
      pairwise(),
      filter(([previous, next]) => hasLicenseInfoChanged(previous, next)),
      map(([, next]) => next)
    );

    setup.license$ = merge(initial$, updates$).pipe(
      takeUntil(this.stop$),
      tap(this.setSession)
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
