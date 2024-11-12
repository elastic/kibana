/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import { Logger } from '@kbn/logging';

import { createRepositoryClient } from '@kbn/server-route-repository-client';
import { from, share, startWith } from 'rxjs';
import { once } from 'lodash';
import type { StreamsPublicConfig } from '../common/config';
import { StreamsPluginClass, StreamsPluginSetup, StreamsPluginStart } from './types';
import { StreamsRepositoryClient } from './api';

export class Plugin implements StreamsPluginClass {
  public config: StreamsPublicConfig;
  public logger: Logger;

  private repositoryClient!: StreamsRepositoryClient;

  constructor(context: PluginInitializerContext<{}>) {
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  setup(core: CoreSetup<{}>, pluginSetup: {}): StreamsPluginSetup {
    this.repositoryClient = createRepositoryClient(core);
    return {
      status$: createStatusObservable(this.repositoryClient),
    };
  }

  start(core: CoreStart, pluginsStart: {}): StreamsPluginStart {
    return {
      streamsRepositoryClient: this.repositoryClient,
      status$: createStatusObservable(this.repositoryClient),
    };
  }

  stop() {}
}

const createStatusObservable = once((repositoryClient: StreamsRepositoryClient) => {
  return from(
    repositoryClient
      .fetch('GET /internal/streams/_settings', {
        signal: new AbortController().signal,
      })
      .then((response) => ({
        status: response.enabled ? ('enabled' as const) : ('disabled' as const),
      }))
  ).pipe(startWith({ status: 'unknown' as const }), share());
});
