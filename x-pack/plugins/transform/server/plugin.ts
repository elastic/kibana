/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import {
  CoreSetup,
  ILegacyCustomClusterClient,
  Plugin,
  ILegacyScopedClusterClient,
  Logger,
  PluginInitializerContext,
} from 'src/core/server';

import { LicenseType } from '../../licensing/common/types';

import { elasticsearchJsPlugin } from './client/elasticsearch_transform';
import { Dependencies } from './types';
import { ApiRoutes } from './routes';
import { License } from './services';

declare module 'kibana/server' {
  interface RequestHandlerContext {
    transform?: {
      dataClient: ILegacyScopedClusterClient;
    };
  }
}

const basicLicense: LicenseType = 'basic';

const PLUGIN = {
  id: 'transform',
  minimumLicenseType: basicLicense,
  getI18nName: (): string =>
    i18n.translate('xpack.transform.appTitle', {
      defaultMessage: 'Transforms',
    }),
};

async function getCustomEsClient(getStartServices: CoreSetup['getStartServices']) {
  const [core] = await getStartServices();
  return core.elasticsearch.legacy.createClient('transform', {
    plugins: [elasticsearchJsPlugin],
  });
}

export class TransformServerPlugin implements Plugin<{}, void, any, any> {
  private readonly apiRoutes: ApiRoutes;
  private readonly license: License;
  private readonly logger: Logger;
  private transformESClient?: ILegacyCustomClusterClient;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
    this.apiRoutes = new ApiRoutes();
    this.license = new License();
  }

  setup({ http, getStartServices }: CoreSetup, { licensing }: Dependencies): {} {
    const router = http.createRouter();

    this.license.setup(
      {
        pluginId: PLUGIN.id,
        minimumLicenseType: PLUGIN.minimumLicenseType,
        defaultErrorMessage: i18n.translate('xpack.transform.licenseCheckErrorMessage', {
          defaultMessage: 'License check failed',
        }),
      },
      {
        licensing,
        logger: this.logger,
      }
    );

    this.apiRoutes.setup({
      router,
      license: this.license,
    });

    // Can access via new platform router's handler function 'context' parameter - context.transform.client
    http.registerRouteHandlerContext('transform', async (context, request) => {
      this.transformESClient =
        this.transformESClient ?? (await getCustomEsClient(getStartServices));
      return {
        dataClient: this.transformESClient.asScoped(request),
      };
    });

    return {};
  }

  start() {}

  stop() {
    if (this.transformESClient) {
      this.transformESClient.close();
    }
  }
}
