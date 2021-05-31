/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  Plugin,
  PluginInitializerContext,
  ILegacyCustomClusterClient,
} from 'src/core/server';

import { PLUGIN } from '../common/constants/plugin';
import { Dependencies } from './types';
import { ApiRoutes } from './routes';
import { IndexDataEnricher } from './services';
import { isEsError, handleEsError, parseEsError } from './shared_imports';
import { elasticsearchJsPlugin } from './client/elasticsearch';
import type { IndexManagementRequestHandlerContext } from './types';

export interface IndexManagementPluginSetup {
  indexDataEnricher: {
    add: IndexDataEnricher['add'];
  };
}

async function getCustomEsClient(getStartServices: CoreSetup['getStartServices']) {
  const [core] = await getStartServices();
  const esClientConfig = { plugins: [elasticsearchJsPlugin] };
  return core.elasticsearch.legacy.createClient('dataManagement', esClientConfig);
}

export class IndexMgmtServerPlugin implements Plugin<IndexManagementPluginSetup, void, any, any> {
  private readonly apiRoutes: ApiRoutes;
  private readonly indexDataEnricher: IndexDataEnricher;
  private dataManagementESClient?: ILegacyCustomClusterClient;

  constructor(initContext: PluginInitializerContext) {
    this.apiRoutes = new ApiRoutes();
    this.indexDataEnricher = new IndexDataEnricher();
  }

  setup(
    { http, getStartServices }: CoreSetup,
    { features, security }: Dependencies
  ): IndexManagementPluginSetup {
    const router = http.createRouter<IndexManagementRequestHandlerContext>();

    features.registerElasticsearchFeature({
      id: PLUGIN.id,
      management: {
        data: ['index_management'],
      },
      privileges: [
        {
          // manage_index_templates is also required, but we will disable specific parts of the
          // UI if this privilege is missing.
          requiredClusterPrivileges: ['monitor'],
          ui: [],
        },
      ],
    });

    http.registerRouteHandlerContext<IndexManagementRequestHandlerContext, 'dataManagement'>(
      'dataManagement',
      async (ctx, request) => {
        this.dataManagementESClient =
          this.dataManagementESClient ?? (await getCustomEsClient(getStartServices));

        return {
          client: this.dataManagementESClient.asScoped(request),
        };
      }
    );

    this.apiRoutes.setup({
      router,
      config: {
        isSecurityEnabled: () => security !== undefined && security.license.isEnabled(),
      },
      indexDataEnricher: this.indexDataEnricher,
      lib: {
        isEsError,
        parseEsError,
        handleEsError,
      },
    });

    return {
      indexDataEnricher: {
        add: this.indexDataEnricher.add.bind(this.indexDataEnricher),
      },
    };
  }

  start() {}

  stop() {
    if (this.dataManagementESClient) {
      this.dataManagementESClient.close();
    }
  }
}
