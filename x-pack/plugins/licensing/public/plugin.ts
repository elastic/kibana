/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, Subject, Subscription } from 'rxjs';

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/public';
import { ILicense } from '../common/types';
import { LicensingPluginSetup, LicensingPluginStart } from './types';
import { createLicenseUpdate } from '../common/license_update';
import { License } from '../common/license';
import { mountExpiredBanner } from './expired_banner';
import { FeatureUsageService } from './services';
import type { PublicLicenseJSON } from '../common/types';

export const licensingSessionStorageKey = 'xpack.licensing';

/**
 * @public
 * A plugin for fetching, refreshing, and receiving information about the license for the
 * current Kibana instance.
 */
export class LicensingPlugin implements Plugin<LicensingPluginSetup, LicensingPluginStart> {
  /**
   * Used as a flag to halt all other plugin observables.
   */
  private stop$ = new Subject<void>();

  /**
   * A function to execute once the plugin's HTTP interceptor needs to stop listening.
   */
  private removeInterceptor?: () => void;
  private internalSubscription?: Subscription;
  private isLicenseExpirationBannerShown? = false;

  private readonly infoEndpoint = '/api/licensing/info';
  private coreStart?: CoreStart;
  private prevSignature?: string;

  private refresh?: () => Promise<ILicense>;
  private license$?: Observable<ILicense>;
  private featureUsage = new FeatureUsageService();

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
    const signatureUpdated$ = new Subject();

    const { license$, refreshManually } = createLicenseUpdate(
      signatureUpdated$,
      this.stop$,
      () => this.fetchLicense(core),
      this.getSaved()
    );

    this.internalSubscription = license$.subscribe((license) => {
      if (license.isAvailable) {
        this.prevSignature = license.signature;
        this.save(license);
      } else {
        this.prevSignature = undefined;
        // Prevent reusing stale license if the fetch operation fails
        this.removeSaved();
      }

      if (license.status === 'expired' && !this.isLicenseExpirationBannerShown && this.coreStart) {
        this.isLicenseExpirationBannerShown = true;
        this.showExpiredBanner(license);
      }
    });

    this.removeInterceptor = core.http.intercept({
      response: async (httpResponse) => {
        // we don't track license as anon users do not have one.
        if (core.http.anonymousPaths.isAnonymous(window.location.pathname)) return httpResponse;
        if (httpResponse.response) {
          const signatureHeader = httpResponse.response.headers.get('kbn-license-sig');
          if (typeof signatureHeader === 'string' && this.prevSignature !== signatureHeader) {
            if (!httpResponse.request!.url.includes(this.infoEndpoint)) {
              signatureUpdated$.next();
            }
          }
        }
        return httpResponse;
      },
    });

    this.refresh = refreshManually;
    this.license$ = license$;

    return {
      refresh: refreshManually,
      license$,
      featureUsage: this.featureUsage.setup(),
    };
  }

  public start(core: CoreStart) {
    this.coreStart = core;
    if (!this.refresh || !this.license$) {
      throw new Error('Setup has not been completed');
    }
    return {
      refresh: this.refresh,
      license$: this.license$,
      featureUsage: this.featureUsage.start({ http: core.http }),
    };
  }

  public stop() {
    this.stop$.next();
    this.stop$.complete();

    if (this.removeInterceptor !== undefined) {
      this.removeInterceptor();
    }
    if (this.internalSubscription !== undefined) {
      this.internalSubscription.unsubscribe();
      this.internalSubscription = undefined;
    }
  }

  private fetchLicense = async (core: CoreSetup): Promise<License> => {
    try {
      const response = await core.http.get<PublicLicenseJSON>({
        path: this.infoEndpoint,
        asSystemRequest: true,
      });
      return new License({
        license: response.license,
        features: response.features,
        signature: response.signature,
      });
    } catch (error) {
      return new License({ error: error.message, signature: '' });
    }
  };

  private showExpiredBanner(license: ILicense) {
    const uploadUrl = this.coreStart!.http.basePath.prepend(
      '/app/management/stack/license_management/upload_license'
    );
    this.coreStart!.overlays.banners.add(
      mountExpiredBanner({
        type: license.type!,
        uploadUrl,
      })
    );
  }
}
