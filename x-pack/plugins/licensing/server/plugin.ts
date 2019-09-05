/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, Subscription } from 'rxjs';
import { first, map } from 'rxjs/operators';
import moment from 'moment';
import { createHash } from 'crypto';
import { TypeOf } from '@kbn/config-schema';
import {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin as CorePlugin,
  PluginInitializerContext,
} from 'src/core/server';
import { Poller } from '../../../../src/core/utils/poller';
import { LicensingPluginSetup, ILicensingPlugin } from '../common/types';
import { License } from '../common/license';
import { hasLicenseInfoChanged } from '../common/has_license_info_changed';
import { LicensingConfig } from './licensing_config';
import { createRouteHandlerContext } from './licensing_route_handler_context';
import { schema } from './schema';

declare module 'src/core/server' {
  interface RequestHandlerContext {
    licensing: {
      license: ILicense;
    };
  }
}

type LicensingConfigType = TypeOf<typeof schema>;

export class Plugin implements CorePlugin<LicensingPluginSetup>, ILicensingPlugin {
  private readonly logger: Logger;
  private readonly config$: Observable<LicensingConfig>;
  private poller!: Poller<License>;
  private configSubscription: Subscription;
  private currentConfig!: LicensingConfig;
  private core!: CoreSetup;
  private refresher?: Promise<void>;

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
    this.config$ = this.context.config
      .create<LicensingConfigType | { config: LicensingConfigType }>()
      .pipe(
        map(config =>
          'config' in config
            ? new LicensingConfig(config.config, this.context.env)
            : new LicensingConfig(config, this.context.env)
        )
      );
    this.configSubscription = this.config$.subscribe(config => {
      this.currentConfig = config;
    });
  }

  private async next(config: LicensingConfig) {
    this.logger.debug(
      `Calling [${config.clusterSource}] Elasticsearch _xpack API. Polling frequency: ${config.pollingFrequency}`
    );

    const cluster = await this.core.elasticsearch.dataClient$.pipe(first()).toPromise();

    try {
      const response = await cluster.callAsInternalUser('transport.request', {
        method: 'GET',
        path: '/_xpack',
      });
      const rawLicense = response && response.license;
      const features = (response && response.features) || {};
      const currentLicense = this.poller.subject$.getValue();
      const licenseInfoChanged = hasLicenseInfoChanged(currentLicense, rawLicense);

      if (!licenseInfoChanged) {
        return undefined;
      }

      const licenseInfo = [
        'type' in rawLicense && `type: ${rawLicense.type}`,
        'status' in rawLicense && `status: ${rawLicense.status}`,
        'expiry_date_in_millis' in rawLicense &&
          `expiry date: ${moment(rawLicense.expiry_date_in_millis, 'x').format()}`,
      ]
        .filter(Boolean)
        .join(' | ');

      this.logger.info(
        `Imported ${currentLicense ? 'changed ' : ''}license information` +
          ` from Elasticsearch for the [${config.clusterSource}] cluster: ${licenseInfo}`
      );

      return new License({
        plugin: this,
        license: rawLicense,
        features,
        clusterSource: config.clusterSource,
      });
    } catch (err) {
      this.logger.warn(
        `License information could not be obtained from Elasticsearch` +
          ` for the [${config.clusterSource}] cluster. ${err}`
      );

      return new License({
        plugin: this,
        features: {},
        error: err,
        clusterSource: config.clusterSource,
      });
    }
  }

  public async refresh() {
    if (this.refresher) {
      return this.refresher;
    }

    this.refresher = new Promise(async resolve => {
      const license = await this.next(this.currentConfig);

      if (license) {
        this.poller.subject$.next(license);
      }

      this.refresher = undefined;
      resolve();
    });
  }

  public sign(serialized: string) {
    return createHash('md5')
      .update(serialized)
      .digest('hex');
  }

  public async setup(core: CoreSetup) {
    const { clusterSource, pollingFrequency } = this.currentConfig;
    const initialLicense = new License({
      plugin: this,
      features: {},
      clusterSource,
    });

    this.core = core;
    this.poller = new Poller<License>(pollingFrequency, initialLicense, () =>
      this.next(this.currentConfig)
    );

    const license$ = this.poller.subject$.asObservable();

    this.core.http.registerRouteHandlerContext('licensing', createRouteHandlerContext(license$));

    return {
      license$,
    };
  }

  public async start(core: CoreStart) {}

  public stop() {
    this.configSubscription.unsubscribe();

    if (this.poller) {
      this.poller.unsubscribe();
    }
  }
}
