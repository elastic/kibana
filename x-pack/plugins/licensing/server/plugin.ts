/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, Subject, Subscription, merge, timer } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import moment from 'moment';
import { createHash } from 'crypto';

import {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
  IClusterClient,
} from 'src/core/server';

import { ILicense, RawLicense, PublicLicense, LicensingPluginSetup } from './types';
import { License } from '../common/license';
import { createLicenseUpdate } from '../common/license_update';

import { LicenseConfigType } from './licensing_config';
import { createRouteHandlerContext } from './licensing_route_handler_context';

export interface ElasticsearchError extends Error {
  status?: number;
}

function normalizeServerLicense(license: RawLicense): PublicLicense['license'] {
  return {
    uid: license.uid,
    type: license.type,
    expiryDateInMillis: license.expiry_date_in_millis,
    status: license.status,
  };
}

function sign(
  licenseJSON: Partial<Pick<PublicLicense, 'license' | 'features'>>,
  error: string = ''
) {
  return createHash('md5')
    .update(JSON.stringify({ ...licenseJSON, error }))
    .digest('hex');
}

/**
 * @public
 * A plugin for fetching, refreshing, and receiving information about the license for the
 * current Kibana instance.
 */
export class LicensingPlugin implements Plugin<LicensingPluginSetup> {
  private stop$ = new Subject();
  private readonly logger: Logger;
  private readonly config$: Observable<LicenseConfigType>;
  private licenseFetchSubscription?: Subscription;
  private loggingSubscription?: Subscription;

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
    this.config$ = this.context.config.create<LicenseConfigType>();
  }

  public async setup(core: CoreSetup) {
    this.logger.debug('Setting up Licensing plugin');
    const config = await this.config$.pipe(take(1)).toPromise();
    const dataClient = await core.elasticsearch.dataClient$.pipe(take(1)).toPromise();

    const { refresh, license$ } = this.createLicensePoller(dataClient, config.pollingFrequency);

    core.http.registerRouteHandlerContext('licensing', createRouteHandlerContext(license$));

    return {
      refresh,
      license$,
    };
  }

  private createLicensePoller(clusterClient: IClusterClient, pollingFrequency: number) {
    const manualRefresh$ = new Subject();
    const intervalRefresh$ = timer(0, pollingFrequency);
    const refresh$ = merge(intervalRefresh$, manualRefresh$).pipe(takeUntil(this.stop$));

    const { update$, fetchSubscription } = createLicenseUpdate(refresh$, () =>
      this.fetchLicense(clusterClient)
    );

    this.licenseFetchSubscription = fetchSubscription;
    this.loggingSubscription = update$.subscribe(license =>
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
      refresh: () => {
        this.logger.debug('Requesting Elasticsearch licensing API');
        manualRefresh$.next();
      },
      license$: update$,
    };
  }

  private fetchLicense = async (clusterClient: IClusterClient): Promise<ILicense> => {
    try {
      const response = await clusterClient.callAsInternalUser('transport.request', {
        method: 'GET',
        path: '/_xpack',
      });

      const normalizedLicense = normalizeServerLicense(response.license);
      const signature = sign({ license: normalizedLicense, features: response.features });

      return new License({
        license: normalizedLicense,
        features: response.features,
        signature,
      });
    } catch (error) {
      this.logger.warn(
        `License information could not be obtained from Elasticsearch due to ${error} error`
      );
      const errorMessage = this.getErrorMessage(error);
      const signature = sign({}, errorMessage);

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

  public async start(core: CoreStart) {}

  public stop() {
    this.stop$.next();
    this.stop$.complete();

    if (this.licenseFetchSubscription !== undefined) {
      this.licenseFetchSubscription.unsubscribe();
      this.licenseFetchSubscription = undefined;
    }

    if (this.loggingSubscription !== undefined) {
      this.loggingSubscription.unsubscribe();
      this.loggingSubscription = undefined;
    }
  }
}
