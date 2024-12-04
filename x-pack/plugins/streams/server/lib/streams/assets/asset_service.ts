/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/observability-utils-server/es/storage';
import { Observable, defer, from, lastValueFrom, share } from 'rxjs';
import { StreamsPluginStartDependencies } from '../../../types';
import { AssetClient } from './asset_client';
import { assetStorageSettings } from './storage_settings';

export class AssetService {
  private adapter$: Observable<StorageIndexAdapter<typeof assetStorageSettings>>;
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly logger: Logger
  ) {
    this.adapter$ = defer(() => from(this.prepareIndex())).pipe(share());
  }

  async prepareIndex(): Promise<StorageIndexAdapter<typeof assetStorageSettings>> {
    const [coreStart] = await this.coreSetup.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;

    const adapter = new StorageIndexAdapter(
      esClient,
      this.logger.get('assets'),
      assetStorageSettings
    );
    await adapter.bootstrap();
    return adapter;
  }

  async getClientWithRequest({ request }: { request: KibanaRequest }): Promise<AssetClient> {
    const [coreStart, pluginsStart] = await this.coreSetup.getStartServices();

    const adapter = await lastValueFrom(this.adapter$);
    return new AssetClient({
      storageClient: adapter.getClient(),
      soClient: coreStart.savedObjects.getScopedClient(request),
      rulesClient: await pluginsStart.alerting.getRulesClientWithRequest(request),
    });
  }
}
