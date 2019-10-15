/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject, Observable, Subject, Subscription, defer, merge, of, timer } from 'rxjs';
import {
  filter,
  first,
  map,
  pairwise,
  repeatWhen,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';
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
import { LicensingPluginSetup, ILicense } from '../common/types';
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

/**
 * Generate the signature for a serialized/stringified license.
 */
function sign(serialized: string) {
  return createHash('md5')
    .update(serialized)
    .digest('hex');
}

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
   * Used to trigger manual fetches of the license information from the server.
   */
  private refresher$ = new BehaviorSubject(true);

  /**
   * Logger instance bound to `licensing` context.
   */
  private readonly logger: Logger;

  /**
   * An observable of licensing configuration data.
   */
  private readonly config$: Observable<LicensingConfig>;

  /**
   * The `this.config$` subscription for tracking changes to configuration.
   */
  private configSubscription: Subscription;

  /**
   * The latest configuration data to come from `this.config$`.
   */
  private currentConfig!: LicensingConfig;

  /**
   * Instance of the elasticsearch API.
   */
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

  /**
   * Initialize the plugin for consumption.
   * @param core
   */
  public async setup(core: CoreSetup) {
    this.elasticsearch = core.elasticsearch;

    let signature = '';
    const { clusterSource, pollingFrequency } = this.currentConfig;
    const initial$ = of(new License({ features: {}, clusterSource }));
    const setup = {
      refresh: () => this.refresher$.next(true),
      license$: initial$,
    };

    // The license fetches occur in a defer/repeatWhen pair to avoid race conditions between refreshes and timers
    const licenseFetches$ = defer(async () => {
      const config = this.currentConfig;

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
          license: rawLicense,
          features,
          clusterSource: config.clusterSource,
        });
      } catch (err) {
        this.logger.warn(
          `License information could not be obtained from Elasticsearch for the [${config.clusterSource}] cluster. ${err}`
        );

        return new License({
          features: {},
          error: err,
          clusterSource: config.clusterSource,
        });
      }
    }).pipe(repeatWhen(complete$ => complete$.pipe(switchMap(() => timer(0, pollingFrequency)))));
    const updates$ = merge(initial$, licenseFetches$).pipe(
      pairwise(),
      filter(([previous, next]) => hasLicenseInfoChanged(previous, next)),
      map(([, next]) => next)
    );

    setup.license$ = merge(initial$, updates$).pipe(
      takeUntil(this.stop$),
      tap(license => {
        signature = sign(JSON.stringify(license.toObject()));
        this.logger.info(
          `Imported license information from Elasticsearch for the [${this.currentConfig.clusterSource}] cluster: ` +
            `type: ${license.type} | status: ${license.status} | expiry date: ${moment(
              license.expiryDateInMillis,
              'x'
            ).format()} | signature: ${signature}`
        );
      })
    );
    core.http.registerRouteHandlerContext('licensing', createRouteHandlerContext(setup.license$));

    return setup;
  }

  public async start(core: CoreStart) {}

  /**
   * Halt the plugin's operations and observables.
   */
  public stop() {
    this.stop$.next();
    this.stop$.complete();
    this.configSubscription.unsubscribe();
  }
}
