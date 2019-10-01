/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject, Observable, Subscription, merge, of, timer } from 'rxjs';
import { filter, first, map, pairwise, switchMap, tap } from 'rxjs/operators';
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
  private configSubscription: Subscription;
  private currentConfig!: LicensingConfig;
  private elasticsearch!: CoreSetup['elasticsearch'];

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

    try {
      const cluster = await this.elasticsearch.dataClient$.pipe(first()).toPromise();
      const response = await cluster.callAsInternalUser('transport.request', {
        method: 'GET',
        path: '/_xpack',
      });
      const rawLicense = response && response.license;
      const features = (response && response.features) || {};

      return new License({
        plugin: this,
        license: rawLicense,
        features,
        clusterSource: config.clusterSource,
      });
    } catch (err) {
      this.logger.warn(
        `License information could not be obtained from Elasticsearch for the [${config.clusterSource}] cluster. ${err}`
      );

      return new License({
        plugin: this,
        features: {},
        error: err,
        clusterSource: config.clusterSource,
      });
    }
  }

  public sign(serialized: string) {
    return createHash('md5')
      .update(serialized)
      .digest('hex');
  }

  public async setup(core: CoreSetup) {
    const { clusterSource, pollingFrequency } = this.currentConfig;

    this.elasticsearch = core.elasticsearch;

    const manual$ = new BehaviorSubject<boolean>(true);
    const license$ = merge(
      of(new License({ plugin: this, features: {}, clusterSource })),
      timer(0, pollingFrequency),
      manual$
    ).pipe(
      switchMap(() => this.next(this.currentConfig)),
      pairwise(),
      filter(([previous, next]) => hasLicenseInfoChanged(previous, next)),
      tap(([, next]) => {
        this.logger.info(
          `Imported license information from Elasticsearch for the [${clusterSource}] cluster: ` +
            `type: ${next.type} | status: ${next.status} | expiry date: ${moment(
              next.expiryDateInMillis,
              'x'
            ).format()}`
        );
      }),
      map(([, next]) => next)
    );

    core.http.registerRouteHandlerContext('licensing', createRouteHandlerContext(license$));

    return {
      license$,
      refresh() {
        manual$.next(true);
      },
    };
  }

  public async start(core: CoreStart) {}

  public stop() {
    this.configSubscription.unsubscribe();
  }
}
