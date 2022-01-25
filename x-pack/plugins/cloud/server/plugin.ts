/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { CoreSetup, Logger, Plugin, PluginInitializerContext } from 'src/core/server';
import { CloudConfigType } from './config';
import { registerCloudUsageCollector } from './collectors';
import { getIsCloudEnabled } from '../common/is_cloud_enabled';
import { parseDeploymentIdFromDeploymentUrl } from './utils';
import { registerFullstoryRoute } from './routes/fullstory';
import { registerChatRoute } from './routes/chat';

interface PluginsSetup {
  usageCollection?: UsageCollectionSetup;
}

export interface CloudSetup {
  cloudId?: string;
  deploymentId?: string;
  isCloudEnabled: boolean;
  apm: {
    url?: string;
    secretToken?: string;
  };
}

export class CloudPlugin implements Plugin<CloudSetup> {
  private readonly logger: Logger;
  private readonly config: CloudConfigType;

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
    this.config = this.context.config.get<CloudConfigType>();
  }

  public setup(core: CoreSetup, { usageCollection }: PluginsSetup) {
    this.logger.debug('Setting up Cloud plugin');
    const isCloudEnabled = getIsCloudEnabled(this.config.id);
    registerCloudUsageCollector(usageCollection, { isCloudEnabled });

    if (this.config.full_story.enabled) {
      registerFullstoryRoute({
        httpResources: core.http.resources,
        packageInfo: this.context.env.packageInfo,
      });
    }

    if (this.config.chat.enabled && this.config.chatIdentitySecret) {
      registerChatRoute({
        httpResources: core.http.resources,
        chatIdentitySecret: this.config.chatIdentitySecret,
      });
    }

    return {
      cloudId: this.config.id,
      deploymentId: parseDeploymentIdFromDeploymentUrl(this.config.deployment_url),
      isCloudEnabled,
      apm: {
        url: this.config.apm?.url,
        secretToken: this.config.apm?.secret_token,
      },
    };
  }

  public start() {}
}
