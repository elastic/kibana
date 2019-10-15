/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject, Subject, merge, of } from 'rxjs';
import { filter, map, pairwise, switchMap, takeUntil, tap } from 'rxjs/operators';
import {
  CoreSetup,
  CoreStart,
  Plugin as CorePlugin,
  PluginInitializerContext,
} from 'src/core/public';
import { LicensingPluginSetup, IObjectifiedLicense } from '../common/types';
import {
  API_ROUTE,
  LICENSING_SESSION,
  LICENSING_SESSION_SIGNATURE,
  SIGNATURE_HEADER,
} from '../common/constants';
import { License } from '../common/license';
import { hasLicenseInfoChanged } from '../common/has_license_info_changed';

/**
 * @public
 * A plugin for fetching, refreshing, and receiving information about the license for the
 * current Kibana instance.
 */
export class Plugin implements CorePlugin<LicensingPluginSetup> {
  /**
   * Used as a flag to halt all other plugin observables.
   */
  private stop$ = new Subject();

  /**
   * A function to execute once the plugin's HTTP interceptor needs to stop listening.
   */
  private removeInterceptor!: () => void;

  /**
   * Used to trigger manual fetches of the license information from the server.
   */
  private refresher$ = new BehaviorSubject(true);

  constructor(context: PluginInitializerContext) {}

  /**
   * Fetch the objectified license and signature from session storage.
   */
  private getSession(): { objectified?: IObjectifiedLicense; signature: string } {
    const raw = sessionStorage.getItem(LICENSING_SESSION);
    const signature = sessionStorage.getItem(LICENSING_SESSION_SIGNATURE) || '';
    const objectified = raw && JSON.parse(raw);

    return { objectified, signature };
  }

  /**
   * Store the given license and signature in session storage.
   */
  private setSession = (license: License, signature: string) => {
    sessionStorage.setItem(LICENSING_SESSION, JSON.stringify(license.toObject()));

    if (signature) {
      sessionStorage.setItem(LICENSING_SESSION_SIGNATURE, signature);
    }
  };

  /**
   * Clear license and signature information from session storage.
   */
  private clearSession() {
    sessionStorage.removeItem(LICENSING_SESSION);
    sessionStorage.removeItem(LICENSING_SESSION_SIGNATURE);
  }

  /**
   * Initialize the plugin for consumption.
   * @param core
   */
  public setup(core: CoreSetup) {
    const session = this.getSession();
    const initial$ = of(
      session.objectified
        ? License.fromObjectified(session.objectified)
        : new License({ features: {} })
    );
    const setup = {
      refresh: () => this.refresher$.next(true),
      license$: initial$,
    };

    this.removeInterceptor = core.http.intercept({
      response: httpResponse => {
        const signatureHeader =
          (httpResponse.response && httpResponse.response.headers.get(SIGNATURE_HEADER)) || '';

        if (signatureHeader !== session.signature) {
          session.signature = signatureHeader;

          if (httpResponse.request && !httpResponse.request.url.includes(API_ROUTE)) {
            setup.refresh();
          }
        }
      },
    });

    // The license fetches occur in a defer/repeatWhen pair to avoid race conditions between refreshes and timers
    const licenseFetches$ = this.refresher$.pipe(
      takeUntil(this.stop$),
      switchMap(async () => {
        try {
          const response = await core.http.get(API_ROUTE);
          const rawLicense = response && response.license;
          const features = (response && response.features) || {};

          return new License({ license: rawLicense, features });
        } catch (err) {
          // Prevent reusing stale license if the fetch operation fails
          this.clearSession();
          return new License({ features: {}, error: err });
        }
      })
    );
    const updates$ = merge(initial$, licenseFetches$).pipe(
      takeUntil(this.stop$),
      pairwise(),
      filter(([previous, next]) => hasLicenseInfoChanged(previous, next)),
      map(([, next]) => next)
    );

    setup.license$ = merge(initial$, updates$).pipe(
      takeUntil(this.stop$),
      tap(license => {
        this.setSession(license, session.signature);
      })
    );

    return setup;
  }

  public async start(core: CoreStart) {}

  /**
   * Halt the plugin's operations and observables.
   */
  public stop() {
    this.stop$.next();
    this.stop$.complete();

    if (this.removeInterceptor) {
      this.removeInterceptor();
    }
  }
}
