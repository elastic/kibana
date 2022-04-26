/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, Subject, Subscription, timer } from 'rxjs';
import moment from 'moment';
import { createHash } from 'crypto';
import stringify from 'json-stable-stringify';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { MaybePromise } from '@kbn/utility-types';
import { isPromise } from '@kbn/std';
import {
  CoreSetup,
  Logger,
  Plugin,
  PluginInitializerContext,
  IClusterClient,
} from '@kbn/core/server';

import {
  ILicense,
  PublicLicense,
  PublicFeatures,
  LicenseType,
  LicenseStatus,
} from '../common/types';
import { LicensingPluginSetup, LicensingPluginStart } from './types';
import { License } from '../common/license';
import { createLicenseUpdate } from '../common/license_update';

import { ElasticsearchError } from './types';
import { registerRoutes } from './routes';
import { FeatureUsageService } from './services';

import { LicenseConfigType } from './licensing_config';
import { createRouteHandlerContext } from './licensing_route_handler_context';
import { createOnPreResponseHandler } from './on_pre_response_handler';
import { getPluginStatus$ } from './plugin_status';

function normalizeServerLicense(
  license: estypes.XpackInfoMinimalLicenseInformation
): PublicLicense {
  return {
    uid: license.uid,
    type: license.type as LicenseType,
    mode: license.mode as LicenseType,
    expiryDateInMillis:
      typeof license.expiry_date_in_millis === 'string'
        ? parseInt(license.expiry_date_in_millis, 10)
        : license.expiry_date_in_millis,
    status: license.status as LicenseStatus,
  };
}

function normalizeFeatures(rawFeatures: estypes.XpackInfoFeatures) {
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
  private stop$ = new Subject<void>();
  private readonly logger: Logger;
  private readonly config: LicenseConfigType;
  private loggingSubscription?: Subscription;
  private featureUsage = new FeatureUsageService();

  private refresh?: () => Promise<ILicense>;
  private license$?: Observable<ILicense>;

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
    this.config = this.context.config.get<LicenseConfigType>();
  }

  public setup(core: CoreSetup<{}, LicensingPluginStart>) {
    this.logger.debug('Setting up Licensing plugin');
    const pollingFrequency = this.config.api_polling_frequency;

    const clientPromise = core.getStartServices().then(([{ elasticsearch }]) => {
      return elasticsearch.client;
    });

    const { refresh, license$ } = this.createLicensePoller(
      clientPromise,
      pollingFrequency.asMilliseconds()
    );

    core.status.set(getPluginStatus$(license$, this.stop$.asObservable()));

    core.http.registerRouteHandlerContext(
      'licensing',
      createRouteHandlerContext(license$, core.getStartServices)
    );

    const featureUsageSetup = this.featureUsage.setup();

    registerRoutes(core.http.createRouter(), featureUsageSetup, core.getStartServices);
    core.http.registerOnPreResponse(createOnPreResponseHandler(refresh, license$));

    this.refresh = refresh;
    this.license$ = license$;

    return {
      refresh,
      license$,
      featureUsage: featureUsageSetup,
    };
  }

  private createLicensePoller(
    clusterClient: MaybePromise<IClusterClient>,
    pollingFrequency: number
  ) {
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

  private fetchLicense = async (clusterClient: MaybePromise<IClusterClient>): Promise<ILicense> => {
    const client = isPromise(clusterClient) ? await clusterClient : clusterClient;
    try {
      const response = await client.asInternalUser.xpack.info();
      const normalizedLicense =
        response.license && response.license.type !== 'missing'
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

  public start() {
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
