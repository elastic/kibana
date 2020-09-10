/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare module 'kibana/server' {
  interface RequestHandlerContext {
    dataManagement?: DataManagementContext;
  }
}

import { i18n } from '@kbn/i18n';
import {
  CoreSetup,
  Plugin,
  Logger,
  PluginInitializerContext,
  ILegacyScopedClusterClient,
  ILegacyCustomClusterClient,
} from 'src/core/server';

import { PLUGIN } from '../common';
import { Dependencies } from './types';
import { ApiRoutes } from './routes';
import { License, IndexDataEnricher } from './services';
import { isEsError } from './shared_imports';
import { elasticsearchJsPlugin } from './client/elasticsearch';

export interface DataManagementContext {
  client: ILegacyScopedClusterClient;
}

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
  private readonly license: License;
  private readonly logger: Logger;
  private readonly indexDataEnricher: IndexDataEnricher;
  private dataManagementESClient?: ILegacyCustomClusterClient;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
    this.apiRoutes = new ApiRoutes();
    this.license = new License();
    this.indexDataEnricher = new IndexDataEnricher();
  }

  setup(
    { http, getStartServices }: CoreSetup,
    { licensing, security }: Dependencies
  ): IndexManagementPluginSetup {
    const router = http.createRouter();

    this.license.setup(
      {
        pluginId: PLUGIN.id,
        minimumLicenseType: PLUGIN.minimumLicenseType,
        defaultErrorMessage: i18n.translate('xpack.idxMgmt.licenseCheckErrorMessage', {
          defaultMessage: 'License check failed',
        }),
      },
      {
        licensing,
        logger: this.logger,
      }
    );

    http.registerRouteHandlerContext('dataManagement', async (ctx, request) => {
      this.dataManagementESClient =
        this.dataManagementESClient ?? (await getCustomEsClient(getStartServices));

      return {
        client: this.dataManagementESClient.asScoped(request),
      };
    });

    this.apiRoutes.setup({
      router,
      license: this.license,
      config: {
        isSecurityEnabled: () => security !== undefined && security.license.isEnabled(),
      },
      indexDataEnricher: this.indexDataEnricher,
      lib: {
        isEsError,
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
