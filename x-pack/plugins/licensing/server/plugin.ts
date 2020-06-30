/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, Subject, Subscription, timer } from 'rxjs';
import { take } from 'rxjs/operators';
import moment from 'moment';
import { createHash } from 'crypto';
import stringify from 'json-stable-stringify';

import {
  CoreSetup,
  Logger,
  Plugin,
  PluginInitializerContext,
  ILegacyClusterClient,
  ILegacyScopedClusterClient,
  ScopeableRequest,
} from 'src/core/server';

import { ILicense, PublicLicense, PublicFeatures } from '../common/types';
import { LicensingPluginSetup, LicensingPluginStart } from './types';
import { License } from '../common/license';
import { createLicenseUpdate } from '../common/license_update';

import { ElasticsearchError, RawLicense, RawFeatures } from './types';
import { registerRoutes } from './routes';
import { FeatureUsageService } from './services';

import { LicenseConfigType } from './licensing_config';
import { createRouteHandlerContext } from './licensing_route_handler_context';
import { createOnPreResponseHandler } from './on_pre_response_handler';

function normalizeServerLicense(license: RawLicense): PublicLicense {
  return {
    uid: license.uid,
    type: license.type,
    mode: license.mode,
    expiryDateInMillis: license.expiry_date_in_millis,
    status: license.status,
  };
}

function normalizeFeatures(rawFeatures: RawFeatures) {
  const features: PublicFeatures = {};
  for (const [name, feature] of Object.entries(rawFeatures)) {
    features[name] = {
      isAvailable: feature.available,
      isEnabled: feature.enabled,
    };
  }
  return features;
}

function sign({
  license,
  features,
  error,
}: {
  license?: PublicLicense;
  features?: PublicFeatures;
  error?: string;
}) {
  return createHash('sha256')
    .update(
      stringify({
        license,
        features,
        error,
      })
    )
    .digest('hex');
}

/**
 * @public
 * A plugin for fetching, refreshing, and receiving information about the license for the
 * current Kibana instance.
 */
export class LicensingPlugin implements Plugin<LicensingPluginSetup, LicensingPluginStart, {}, {}> {
  private stop$ = new Subject();
  private readonly logger: Logger;
  private readonly config$: Observable<LicenseConfigType>;
  private loggingSubscription?: Subscription;
  private featureUsage = new FeatureUsageService();

  private refresh?: () => Promise<ILicense>;
  private license$?: Observable<ILicense>;

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
    this.config$ = this.context.config.create<LicenseConfigType>();
  }

  public async setup(core: CoreSetup<{}, LicensingPluginStart>) {
    this.logger.debug('Setting up Licensing plugin');
    const config = await this.config$.pipe(take(1)).toPromise();
    const pollingFrequency = config.api_polling_frequency;

    async function callAsInternalUser(
      ...args: Parameters<ILegacyScopedClusterClient['callAsInternalUser']>
    ): ReturnType<ILegacyScopedClusterClient['callAsInternalUser']> {
      const [coreStart] = await core.getStartServices();
      const client = coreStart.elasticsearch.legacy.client;
      return await client.callAsInternalUser(...args);
    }

    const client: ILegacyClusterClient = {
      callAsInternalUser,
      asScoped(request?: ScopeableRequest): ILegacyScopedClusterClient {
        return {
          async callAsCurrentUser(
            ...args: Parameters<ILegacyScopedClusterClient['callAsCurrentUser']>
          ): ReturnType<ILegacyScopedClusterClient['callAsCurrentUser']> {
            const [coreStart] = await core.getStartServices();
            const _client = coreStart.elasticsearch.legacy.client;
            return await _client.asScoped(request).callAsCurrentUser(...args);
          },
          callAsInternalUser,
        };
      },
    };

    const { refresh, license$ } = this.createLicensePoller(
      client,
      pollingFrequency.asMilliseconds()
    );

    core.http.registerRouteHandlerContext(
      'licensing',
      createRouteHandlerContext(license$, core.getStartServices)
    );

    registerRoutes(core.http.createRouter(), core.getStartServices);
    core.http.registerOnPreResponse(createOnPreResponseHandler(refresh, license$));

    this.refresh = refresh;
    this.license$ = license$;

    return {
      refresh,
      license$,
      createLicensePoller: this.createLicensePoller.bind(this),
      featureUsage: this.featureUsage.setup(),
    };
  }

  private createLicensePoller(clusterClient: ILegacyClusterClient, pollingFrequency: number) {
    this.logger.debug(`Polling Elasticsearch License API with frequency ${pollingFrequency}ms.`);

    const intervalRefresh$ = timer(0, pollingFrequency);

    const { license$, refreshManually } = createLicenseUpdate(intervalRefresh$, this.stop$, () =>
      this.fetchLicense(clusterClient)
    );

    this.loggingSubscription = license$.subscribe((license) =>
      this.logger.debug(
        'Imported license information from Elasticsearch:' +
          [
            `type: ${license.type}`,
            `status: ${license.status}`,
            `expiry date: ${moment(license.expiryDateInMillis, 'x').format()}`,
          ].join(' | ')
      )
    );

    return {
      refresh: async () => {
        this.logger.debug('Requesting Elasticsearch licensing API');
        return await refreshManually();
      },
      license$,
    };
  }

  private fetchLicense = async (clusterClient: ILegacyClusterClient): Promise<ILicense> => {
    try {
      const response = await clusterClient.callAsInternalUser('transport.request', {
        method: 'GET',
        path: '/_xpack',
      });

      const normalizedLicense = response.license
        ? normalizeServerLicense(response.license)
        : undefined;
      const normalizedFeatures = response.features
        ? normalizeFeatures(response.features)
        : undefined;

      const signature = sign({
        license: normalizedLicense,
        features: normalizedFeatures,
        error: '',
      });

      return new License({
        license: normalizedLicense,
        features: normalizedFeatures,
        signature,
      });
    } catch (error) {
      this.logger.warn(
        `License information could not be obtained from Elasticsearch due to ${error} error`
      );
      const errorMessage = this.getErrorMessage(error);
      const signature = sign({ error: errorMessage });

      return new License({
        error: this.getErrorMessage(error),
        signature,
      });
    }
  };

  private getErrorMessage(error: ElasticsearchError): string {
    if (error.status === 400) {
      return 'X-Pack plugin is not installed on the Elasticsearch cluster.';
    }
    return error.message;
  }

  public async start() {
    if (!this.refresh || !this.license$) {
      throw new Error('Setup has not been completed');
    }
    return {
      refresh: this.refresh,
      license$: this.license$,
      featureUsage: this.featureUsage.start(),
      createLicensePoller: this.createLicensePoller.bind(this),
    };
  }

  public stop() {
    this.stop$.next();
    this.stop$.complete();

    if (this.loggingSubscription !== undefined) {
      this.loggingSubscription.unsubscribe();
      this.loggingSubscription = undefined;
    }
  }
}
