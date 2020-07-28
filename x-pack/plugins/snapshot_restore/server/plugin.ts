/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
declare module 'kibana/server' {
  interface RequestHandlerContext {
    snapshotRestore?: SnapshotRestoreContext;
  }
}

import { first } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import {
  CoreSetup,
  ILegacyCustomClusterClient,
  Plugin,
  Logger,
  PluginInitializerContext,
  ILegacyScopedClusterClient,
} from 'kibana/server';

import { PLUGIN } from '../common';
import { License } from './services';
import { ApiRoutes } from './routes';
import { wrapEsError } from './lib';
import { isEsError } from './shared_imports';
import { elasticsearchJsPlugin } from './client/elasticsearch_sr';
import { Dependencies } from './types';
import { SnapshotRestoreConfig } from './config';

export interface SnapshotRestoreContext {
  client: ILegacyScopedClusterClient;
}

async function getCustomEsClient(getStartServices: CoreSetup['getStartServices']) {
  const [core] = await getStartServices();
  const esClientConfig = { plugins: [elasticsearchJsPlugin] };
  return core.elasticsearch.legacy.createClient('snapshotRestore', esClientConfig);
}

export class SnapshotRestoreServerPlugin implements Plugin<void, void, any, any> {
  private readonly logger: Logger;
  private readonly apiRoutes: ApiRoutes;
  private readonly license: License;
  private snapshotRestoreESClient?: ILegacyCustomClusterClient;

  constructor(private context: PluginInitializerContext) {
    const { logger } = this.context;
    this.logger = logger.get();
    this.apiRoutes = new ApiRoutes();
    this.license = new License();
  }

  public async setup(
    { http, getStartServices }: CoreSetup,
    { licensing, security, cloud }: Dependencies
  ): Promise<void> {
    const pluginConfig = await this.context.config
      .create<SnapshotRestoreConfig>()
      .pipe(first())
      .toPromise();

    if (!pluginConfig.enabled) {
      return;
    }

    const router = http.createRouter();

    this.license.setup(
      {
        pluginId: PLUGIN.id,
        minimumLicenseType: PLUGIN.minimumLicenseType,
        defaultErrorMessage: i18n.translate('xpack.snapshotRestore.licenseCheckErrorMessage', {
          defaultMessage: 'License check failed',
        }),
      },
      {
        licensing,
        logger: this.logger,
      }
    );

    http.registerRouteHandlerContext('snapshotRestore', async (ctx, request) => {
      this.snapshotRestoreESClient =
        this.snapshotRestoreESClient ?? (await getCustomEsClient(getStartServices));
      return {
        client: this.snapshotRestoreESClient.asScoped(request),
      };
    });

    this.apiRoutes.setup({
      router,
      license: this.license,
      config: {
        isSecurityEnabled: () => security !== undefined && security.license.isEnabled(),
        isCloudEnabled: cloud !== undefined && cloud.isCloudEnabled,
        isSlmEnabled: pluginConfig.slm_ui.enabled,
      },
      lib: {
        isEsError,
        wrapEsError,
      },
    });
  }

  public start() {}

  public stop() {
    if (this.snapshotRestoreESClient) {
      this.snapshotRestoreESClient.close();
    }
  }
}
