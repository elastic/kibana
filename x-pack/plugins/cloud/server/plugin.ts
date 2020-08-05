/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { CoreSetup, Logger, Plugin, PluginInitializerContext } from 'src/core/server';
import { CloudConfigType } from './config';
import { registerCloudUsageCollector } from './collectors';
import { getIsCloudEnabled } from '../common/is_cloud_enabled';

interface PluginsSetup {
  usageCollection?: UsageCollectionSetup;
}

export interface CloudSetup {
  cloudId?: string;
  isCloudEnabled: boolean;
  apm: {
    url?: string;
    secretToken?: string;
  };
}

export class CloudPlugin implements Plugin<CloudSetup> {
  private readonly logger: Logger;
  private readonly config$: Observable<CloudConfigType>;

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
    this.config$ = this.context.config.create<CloudConfigType>();
  }

  public async setup(core: CoreSetup, { usageCollection }: PluginsSetup) {
    this.logger.debug('Setting up Cloud plugin');
    const config = await this.config$.pipe(first()).toPromise();
    const isCloudEnabled = getIsCloudEnabled(config.id);
    registerCloudUsageCollector(usageCollection, { isCloudEnabled });

    return {
      cloudId: config.id,
      isCloudEnabled,
      apm: {
        url: config.apm?.url,
        secretToken: config.apm?.secret_token,
      },
    };
  }

  public start() {}
}
