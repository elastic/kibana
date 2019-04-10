/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Server } from 'hapi';
import * as Rx from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Cluster, ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';
import { Poller } from '../../../../common/poller';

export type SecurityRealm =
  | 'file'
  | 'ldap'
  | 'native'
  | 'saml'
  | 'kerberos'
  | 'oidc'
  | 'active_directory'
  | 'pki';

export interface XPackUsageResponse {
  security: {
    available: boolean;
    enabled: boolean;
    realms: {
      [key in SecurityRealm]?: {
        available: boolean;
        enabled: boolean;
      }
    };
    token_service: {
      enabled: boolean;
    };
    api_key_service: {
      enabled: boolean;
    };
    audit: {
      enabled: boolean;
    };
  };
}

interface XPackUsageOptions {
  pollFrequencyInMillis?: number;
}

export interface XPackUsageContract {
  getUsage$(): Rx.Observable<XPackUsageResponse | undefined>;
  refreshNow(): void;
}

export interface XPackUsageDeps {
  elasticsearch: ElasticsearchPlugin;
}

export class XPackUsage {
  private cluster: Cluster | null;

  private poller: Poller | null;

  private stop$ = new Rx.ReplaySubject(1);

  private readonly pollFrequencyInMillis: number;

  private readonly log: (tags: string[], message: string) => void;

  private readonly usage$ = new Rx.BehaviorSubject<XPackUsageResponse | undefined>(undefined);

  constructor(server: Server, { pollFrequencyInMillis = 30000 }: XPackUsageOptions) {
    this.cluster = null;
    this.pollFrequencyInMillis = pollFrequencyInMillis;
    this.poller = null;
    this.log = server.log.bind(server);
  }

  public setup(deps: XPackUsageDeps): XPackUsageContract {
    this.cluster = deps.elasticsearch.getCluster('data');

    this.poller = new Poller({
      functionToPoll: () => this.refreshNow(),
      trailing: true,
      pollFrequencyInMillis: this.pollFrequencyInMillis,
      continuePollingOnError: true,
    });

    this.stop$ = new Rx.ReplaySubject(1);

    return {
      getUsage$: () => {
        return this.usage$.pipe(takeUntil(this.stop$));
      },
      refreshNow: this.refreshNow,
    };
  }

  public stop() {
    if (this.poller) {
      this.poller.stop();
      this.poller = null;
    }

    this.usage$.complete();
    this.stop$.next();
    this.cluster = null;
  }

  private async refreshNow() {
    if (!this.poller || !this.cluster) {
      this.log(
        ['usage', 'error', 'xpack'],
        `Refresh requested, but xpack_usage service has not been setup!`
      );
      return;
    }

    this.log(
      ['usage', 'debug', 'xpack'],
      `Calling [data] Elasticsearch _xpack/usage API. Polling frequency: ${this.poller.getPollFrequency()}`
    );

    this.poller.stop();

    try {
      const response = await this.cluster.callWithInternalUser('transport.request', {
        method: 'GET',
        path: '/_xpack/usage',
      });

      this.usage$.next(Object.freeze(response));
    } catch (error) {
      this.log(
        ['usage', 'warning', 'xpack'],
        `XPack usage information could not be obtained from Elasticsearch for the [data] cluster. ${error}`
      );
    }

    this.poller.start();
  }
}
