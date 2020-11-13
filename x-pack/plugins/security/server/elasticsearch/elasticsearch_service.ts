/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { distinctUntilChanged, filter, map, shareReplay, tap } from 'rxjs/operators';
import {
  ILegacyClusterClient,
  ILegacyCustomClusterClient,
  Logger,
  ServiceStatusLevels,
  StatusServiceSetup,
  ElasticsearchServiceSetup as CoreElasticsearchServiceSetup,
} from '../../../../../src/core/server';
import { SecurityLicense } from '../../common/licensing';
import { elasticsearchClientPlugin } from './elasticsearch_client_plugin';

export interface ElasticsearchServiceSetupParams {
  readonly elasticsearch: CoreElasticsearchServiceSetup;
  readonly status: StatusServiceSetup;
  readonly license: SecurityLicense;
}

export interface ElasticsearchServiceSetup {
  readonly clusterClient: ILegacyClusterClient;
}

export interface ElasticsearchServiceStart {
  readonly clusterClient: ILegacyClusterClient;
  readonly watchOnlineStatus$: () => Observable<OnlineStatusRetryScheduler>;
}

export interface OnlineStatusRetryScheduler {
  scheduleRetry: () => void;
}

/**
 * Service responsible for interactions with the Elasticsearch.
 */
export class ElasticsearchService {
  readonly #logger: Logger;
  #clusterClient?: ILegacyCustomClusterClient;
  #coreStatus$!: Observable<boolean>;

  constructor(logger: Logger) {
    this.#logger = logger;
  }

  setup({
    elasticsearch,
    status,
    license,
  }: ElasticsearchServiceSetupParams): ElasticsearchServiceSetup {
    this.#clusterClient = elasticsearch.legacy.createClient('security', {
      plugins: [elasticsearchClientPlugin],
    });

    this.#coreStatus$ = combineLatest([status.core$, license.features$]).pipe(
      map(
        ([coreStatus]) =>
          license.isEnabled() && coreStatus.elasticsearch.level === ServiceStatusLevels.available
      ),
      shareReplay(1)
    );

    return { clusterClient: this.#clusterClient };
  }

  start(): ElasticsearchServiceStart {
    return {
      clusterClient: this.#clusterClient!,

      // We'll need to get rid of this as soon as Core's Elasticsearch service exposes this
      // functionality in the scope of https://github.com/elastic/kibana/issues/41983.
      watchOnlineStatus$: () => {
        const RETRY_SCALE_DURATION = 100;
        const RETRY_TIMEOUT_MAX = 10000;
        const retries$ = new BehaviorSubject(0);

        const retryScheduler = {
          scheduleRetry: () => {
            const retriesElapsed = retries$.getValue() + 1;
            const nextRetryTimeout = Math.min(
              retriesElapsed * RETRY_SCALE_DURATION,
              RETRY_TIMEOUT_MAX
            );

            this.#logger.debug(`Scheduling re-try in ${nextRetryTimeout} ms.`);

            retryTimeout = setTimeout(() => retries$.next(retriesElapsed), nextRetryTimeout);
          },
        };

        let retryTimeout: NodeJS.Timeout;
        return combineLatest([
          this.#coreStatus$.pipe(
            tap(() => {
              // If status or license change occurred before retry timeout we should cancel
              // it and reset retry counter.
              if (retryTimeout) {
                clearTimeout(retryTimeout);
              }

              if (retries$.value > 0) {
                retries$.next(0);
              }
            })
          ),
          retries$.asObservable().pipe(
            // We shouldn't emit new value if retry counter is reset. This comparator isn't called for
            // the initial value.
            distinctUntilChanged((prev, curr) => prev === curr || curr === 0)
          ),
        ]).pipe(
          filter(([isAvailable]) => isAvailable),
          map(() => retryScheduler)
        );
      },
    };
  }

  stop() {
    if (this.#clusterClient) {
      this.#clusterClient.close();
      this.#clusterClient = undefined;
    }
  }
}
