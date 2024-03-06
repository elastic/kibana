/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, Subscription } from 'rxjs';

import { CloudSetup } from '@kbn/cloud-plugin/server';
import { ElasticsearchConfig } from '@kbn/core/server';

export class GlobalConfigService {
  /**
   *
   */

  private cloudUrl?: string;

  /**
   * An observable that emits elasticsearch config.
   */
  private config$?: Observable<ElasticsearchConfig>;

  /**
   * A reference to the subscription to the elasticsearch observable
   */
  private configSub?: Subscription;

  public get elasticsearchUrl(): string {
    return this.cloudUrl
      ? this.cloudUrl
      : this.globalConfigElasticsearchUrl || 'https://your_deployment_url';
  }

  /**
   * The elasticsearch config value at a given point in time.
   */
  private globalConfigElasticsearchUrl?: string;

  setup(config$: Observable<ElasticsearchConfig>, cloud: CloudSetup) {
    this.cloudUrl = cloud.elasticsearchUrl;
    this.config$ = config$;
    this.configSub = this.config$.subscribe((config) => {
      const rawHost = config.hosts[0];
      // strip username, password, URL params and other potentially sensitive info from hosts URL
      const hostUrl = new URL(rawHost);
      this.globalConfigElasticsearchUrl = `${hostUrl.origin}${hostUrl.pathname}`;
    });
  }

  stop() {
    if (this.configSub) {
      this.configSub.unsubscribe();
    }
  }
}
