/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare module 'kibana/server' {
  interface RequestHandlerContext {
    crossClusterReplication?: CrossClusterReplicationContext;
  }
}

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import {
  CoreSetup,
  Plugin,
  Logger,
  PluginInitializerContext,
  APICaller,
  IScopedClusterClient,
} from 'src/core/server';

import { Index } from '../../index_management/server';
import { PLUGIN } from '../common/constants';
import { Dependencies } from './types';
import { registerApiRoutes } from './routes';
import { License } from './services';
import { elasticsearchJsPlugin } from './client/elasticsearch_ccr';
import { CrossClusterReplicationConfig } from './config';
import { isEsError } from './lib/is_es_error';

interface CrossClusterReplicationContext {
  client: IScopedClusterClient;
}

const ccrDataEnricher = async (indicesList: Index[], callWithRequest: APICaller) => {
  if (!indicesList?.length) {
    return indicesList;
  }
  const params = {
    path: '/_all/_ccr/info',
    method: 'GET',
  };
  try {
    const { follower_indices: followerIndices } = await callWithRequest(
      'transport.request',
      params
    );
    return indicesList.map(index => {
      const isFollowerIndex = !!followerIndices.find(
        (followerIndex: { follower_index: string }) => {
          return followerIndex.follower_index === index.name;
        }
      );
      return {
        ...index,
        isFollowerIndex,
      };
    });
  } catch (e) {
    return indicesList;
  }
};

export class CrossClusterReplicationServerPlugin implements Plugin<void, void, any, any> {
  private readonly config$: Observable<CrossClusterReplicationConfig>;
  private readonly license: License;
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config$ = initializerContext.config.create();
    this.license = new License();
  }

  async setup(
    { http, elasticsearch }: CoreSetup,
    { licensing, indexManagement, security }: Dependencies
  ): Promise<void> {
    const router = http.createRouter();
    const config = await this.config$.pipe(first()).toPromise();

    this.license.setup(
      {
        pluginId: PLUGIN.ID,
        minimumLicenseType: PLUGIN.minimumLicenseType,
        defaultErrorMessage: i18n.translate('xpack.indexLifecycleMgmt.licenseCheckErrorMessage', {
          defaultMessage: 'License check failed',
        }),
      },
      {
        licensing,
        logger: this.logger,
      }
    );

    // Extend the elasticsearchJs client with additional endpoints.
    const esClientConfig = { plugins: [elasticsearchJsPlugin] };
    const ccrEsClient = elasticsearch.createClient('crossClusterReplication', esClientConfig);
    http.registerRouteHandlerContext('crossClusterReplication', (ctx, request) => {
      return {
        client: ccrEsClient.asScoped(request),
      };
    });

    registerApiRoutes({
      router,
      license: this.license,
      security,
      lib: {
        isEsError,
      },
    });

    if (config.ui.enabled) {
      if (indexManagement.indexDataEnricher) {
        indexManagement.indexDataEnricher.add(ccrDataEnricher);
      }
    }
  }

  start() {}
  stop() {}
}
