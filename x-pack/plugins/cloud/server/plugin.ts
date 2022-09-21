/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { CloudExperimentsPluginSetup } from '@kbn/cloud-experiments-plugin/common';
import { createSHA256Hash } from '@kbn/crypto';
import { registerCloudDeploymentIdAnalyticsContext } from '../common/register_cloud_deployment_id_analytics_context';
import { CloudConfigType } from './config';
import { registerCloudUsageCollector } from './collectors';
import { getIsCloudEnabled } from '../common/is_cloud_enabled';
import { parseDeploymentIdFromDeploymentUrl } from './utils';
import { registerFullstoryRoute } from './routes/fullstory';
import { registerChatRoute } from './routes/chat';
import { readInstanceSizeMb } from './env';

interface PluginsSetup {
  usageCollection?: UsageCollectionSetup;
  security?: SecurityPluginSetup;
  cloudExperiments?: CloudExperimentsPluginSetup;
}

export interface CloudSetup {
  cloudId?: string;
  deploymentId?: string;
  isCloudEnabled: boolean;
  instanceSizeMb?: number;
  apm: {
    url?: string;
    secretToken?: string;
  };
}

export class CloudPlugin implements Plugin<CloudSetup> {
  private readonly logger: Logger;
  private readonly config: CloudConfigType;
  private readonly isDev: boolean;

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
    this.config = this.context.config.get<CloudConfigType>();
    this.isDev = this.context.env.mode.dev;
  }

  public setup(
    core: CoreSetup,
    { cloudExperiments, usageCollection, security }: PluginsSetup
  ): CloudSetup {
    this.logger.debug('Setting up Cloud plugin');
    const isCloudEnabled = getIsCloudEnabled(this.config.id);
    registerCloudDeploymentIdAnalyticsContext(core.analytics, this.config.id);
    registerCloudUsageCollector(usageCollection, { isCloudEnabled });

    if (isCloudEnabled) {
      security?.setIsElasticCloudDeployment();
    }

    if (isCloudEnabled && this.config.id) {
      // We use the Cloud ID as the userId in the Cloud Experiments
      cloudExperiments?.identifyUser(createSHA256Hash(this.config.id), {
        kibanaVersion: this.context.env.packageInfo.version,
      });
    }

    if (this.config.full_story.enabled) {
      registerFullstoryRoute({
        httpResources: core.http.resources,
        packageInfo: this.context.env.packageInfo,
      });
    }

    if (this.config.chat.enabled && this.config.chatIdentitySecret) {
      registerChatRoute({
        router: core.http.createRouter(),
        chatIdentitySecret: this.config.chatIdentitySecret,
        security,
        isDev: this.isDev,
      });
    }

    return {
      cloudId: this.config.id,
      instanceSizeMb: readInstanceSizeMb(),
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
