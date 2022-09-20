/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { registerCloudDeploymentIdAnalyticsContext } from '../common/register_cloud_deployment_id_analytics_context';
import type { CloudConfigType } from './config';
import { registerCloudUsageCollector } from './collectors';
import { getIsCloudEnabled } from '../common/is_cloud_enabled';
import { parseDeploymentIdFromDeploymentUrl } from './utils';
import { readInstanceSizeMb } from './env';

interface PluginsSetup {
  security?: SecurityPluginSetup;
  usageCollection?: UsageCollectionSetup;
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

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
    this.config = this.context.config.get<CloudConfigType>();
  }

  public setup(core: CoreSetup, { usageCollection, security }: PluginsSetup): CloudSetup {
    this.logger.debug('Setting up Cloud plugin');
    const isCloudEnabled = getIsCloudEnabled(this.config.id);
    registerCloudDeploymentIdAnalyticsContext(core.analytics, this.config.id);
    registerCloudUsageCollector(usageCollection, { isCloudEnabled });

    if (isCloudEnabled) {
      security?.setIsElasticCloudDeployment();
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
