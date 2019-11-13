/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject, Subscription, merge } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';

import { CoreSetup, Plugin, PluginInitializerContext } from 'src/core/public';

import { ILicense, LicensingPluginSetup } from '../common/types';
import { createLicenseUpdate } from '../common/license_update';
import { License } from '../common/license';

export const licensingSessionStorageKey = 'xpack.licensing';

/**
 * @public
 * A plugin for fetching, refreshing, and receiving information about the license for the
 * current Kibana instance.
 */
export class LicensingPlugin implements Plugin<LicensingPluginSetup> {
  /**
   * Used as a flag to halt all other plugin observables.
   */
  private stop$ = new Subject();

  /**
   * A function to execute once the plugin's HTTP interceptor needs to stop listening.
   */
  private removeInterceptor?: () => void;
  private licenseFetchSubscription?: Subscription;

  private infoEndpoint = '/api/xpack/v1/info';
  private prevSignature?: string;

  constructor(
    context: PluginInitializerContext,
    private readonly storage: Storage = sessionStorage
  ) {}

  /**
   * Fetch the objectified license and signature from storage.
   */
  private getSaved(): ILicense | undefined {
    const raw = this.storage.getItem(licensingSessionStorageKey);
    if (!raw) return;
    return License.fromJSON(JSON.parse(raw));
  }

  /**
   * Store the given license and signature in storage.
   */
  private save(license: ILicense) {
    this.storage.setItem(licensingSessionStorageKey, JSON.stringify(license));
  }

  /**
   * Clear license and signature information from storage.
   */
  private removeSaved() {
    this.storage.removeItem(licensingSessionStorageKey);
  }

  public setup(core: CoreSetup) {
    const manualRefresh$ = new Subject();
    const signatureUpdated$ = new Subject();
    const refresh$ = merge(signatureUpdated$, manualRefresh$).pipe(takeUntil(this.stop$));

    const savedLicense = this.getSaved();
    const { update$, fetchSubscription } = createLicenseUpdate(
      refresh$,
      () => this.fetchLicense(core),
      savedLicense
    );
    this.licenseFetchSubscription = fetchSubscription;

    const license$ = update$.pipe(
      tap(license => {
        if (license.error) {
          this.prevSignature = undefined;
          // Prevent reusing stale license if the fetch operation fails
          this.removeSaved();
        } else {
          this.prevSignature = license.signature;
          this.save(license);
        }
      })
    );

    this.removeInterceptor = core.http.intercept({
      response: async httpResponse => {
        if (httpResponse.response) {
          const signatureHeader = httpResponse.response.headers.get('kbn-xpack-sig');
          if (this.prevSignature !== signatureHeader) {
            if (!httpResponse.request!.url.includes(this.infoEndpoint)) {
              signatureUpdated$.next();
            }
          }
        }
        return httpResponse;
      },
    });

    return {
      refresh: () => {
        manualRefresh$.next();
      },
      license$,
    };
  }

  public async start() {}

  public stop() {
    this.stop$.next();
    this.stop$.complete();

    if (this.removeInterceptor !== undefined) {
      this.removeInterceptor();
    }
    if (this.licenseFetchSubscription !== undefined) {
      this.licenseFetchSubscription.unsubscribe();
      this.licenseFetchSubscription = undefined;
    }
  }

  private fetchLicense = async (core: CoreSetup): Promise<ILicense> => {
    try {
      const response = await core.http.get(this.infoEndpoint);
      return new License({
        license: response.license,
        features: response.features,
        signature: response.signature,
      });
    } catch (error) {
      return new License({ error: error.message, signature: '' });
    }
  };
}
