/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Server } from 'hapi';
import * as Rx from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Cluster } from 'src/legacy/core_plugins/elasticsearch';
import { Poller } from '../../../../common/poller';

type SecurityRealm = 'file' | 'ldap' | 'native' | 'saml' | 'kerberos' | 'oidc' | 'active_directory' | 'pki';

export interface XPackUsageResponse {
  security: {
    available: boolean;
    enabled: boolean;
    realms: {
      [key in SecurityRealm]: {
        available: boolean;
        enabled: boolean;
      };
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
}

export class XPackUsage implements XPackUsageContract {
  private readonly cluster: Cluster;

  private readonly poller: Poller;

  private readonly log: (tags: string[], message: string) => void;

  private readonly stop$ = new Rx.ReplaySubject(1);

  private readonly usage$ = new Rx.BehaviorSubject<XPackUsageResponse | undefined>(undefined);

  constructor(server: Server, { pollFrequencyInMillis }: XPackUsageOptions) {
    this.cluster = server.plugins.elasticsearch.getCluster('data');

    this.poller = new Poller({
      functionToPoll: () => this.refreshNow(),
      trailing: true,
      pollFrequencyInMillis,
      continuePollingOnError: true,
    });

    this.log = server.log.bind(server);
  }

  public getUsage$() {
    return this.usage$.pipe(takeUntil(this.stop$));
  }

  public async refreshNow() {
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
