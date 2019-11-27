/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { CloudConfigType } from './config';
import { registerCloudUsageCollector } from './collectors';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { getIsCloudEnabled } from '../common/is_cloud_enabled';
import {
  CoreSetup,
  Logger,
  Plugin,
  PluginInitializerContext,
} from 'src/core/server';

interface PluginsSetup {
  usageCollection?: UsageCollectionSetup;
}
export interface CloudSetup {
  isCloudEnabled: boolean;
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
      isCloudEnabled,
    };
  }

  public start() {}
}
