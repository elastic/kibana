/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import {
  ClusterClient,
  CoreSetup,
  KibanaRequest,
  Logger,
  PluginInitializerContext,
  RecursiveReadonly,
} from '../../../../src/core/server';
import { deepFreeze } from '../../../../src/core/utils';
import { XPackInfo } from '../../../legacy/plugins/xpack_main/server/lib/xpack_info';
import { AuthenticatedUser } from '../common/model';
import { Authenticator, setupAuthentication } from './authentication';
import { createConfig$ } from './config';
import {
  CreateAPIKeyParams,
  CreateAPIKeyResult,
  InvalidateAPIKeyParams,
  InvalidateAPIKeyResult,
} from './authentication/api_keys';

/**
 * Describes a set of APIs that is available in the legacy platform only and required by this plugin
 * to function properly.
 */
export interface LegacyAPI {
  xpackInfo: Pick<XPackInfo, 'isAvailable' | 'feature'>;
  isSystemAPIRequest: (request: KibanaRequest) => boolean;
}

/**
 * Describes public Security plugin contract returned at the `setup` stage.
 */
export interface PluginSetupContract {
  authc: {
    login: Authenticator['login'];
    logout: Authenticator['logout'];
    getCurrentUser: (request: KibanaRequest) => Promise<AuthenticatedUser | null>;
    isAuthenticated: (request: KibanaRequest) => Promise<boolean>;
    createAPIKey: (
      request: KibanaRequest,
      params: CreateAPIKeyParams
    ) => Promise<CreateAPIKeyResult | null>;
    invalidateAPIKey: (
      request: KibanaRequest,
      params: InvalidateAPIKeyParams
    ) => Promise<InvalidateAPIKeyResult | null>;
  };

  config: RecursiveReadonly<{
    sessionTimeout: number | null;
    secureCookies: boolean;
    authc: { providers: string[] };
  }>;

  registerLegacyAPI: (legacyAPI: LegacyAPI) => void;
}

/**
 * Represents Security Plugin instance that will be managed by the Kibana plugin system.
 */
export class Plugin {
  private readonly logger: Logger;
  private clusterClient?: ClusterClient;

  private legacyAPI?: LegacyAPI;
  private readonly getLegacyAPI = () => {
    if (!this.legacyAPI) {
      throw new Error('Legacy API is not registered!');
    }
    return this.legacyAPI;
  };

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public async setup(core: CoreSetup): Promise<RecursiveReadonly<PluginSetupContract>> {
    const config = await createConfig$(this.initializerContext, core.http.isTlsEnabled)
      .pipe(first())
      .toPromise();

    this.clusterClient = core.elasticsearch.createClient('security', {
      plugins: [require('../../../legacy/server/lib/esjs_shield_plugin')],
    });

    return deepFreeze({
      registerLegacyAPI: (legacyAPI: LegacyAPI) => (this.legacyAPI = legacyAPI),

      authc: await setupAuthentication({
        core,
        config,
        clusterClient: this.clusterClient,
        loggers: this.initializerContext.logger,
        getLegacyAPI: this.getLegacyAPI,
      }),

      // We should stop exposing this config as soon as only new platform plugin consumes it. The only
      // exception may be `sessionTimeout` as other parts of the app may want to know it.
      config: {
        sessionTimeout: config.sessionTimeout,
        secureCookies: config.secureCookies,
        cookieName: config.cookieName,
        authc: { providers: config.authc.providers },
      },
    });
  }

  public start() {
    this.logger.debug('Starting plugin');
  }

  public stop() {
    this.logger.debug('Stopping plugin');

    if (this.clusterClient) {
      this.clusterClient.close();
      this.clusterClient = undefined;
    }
  }
}
