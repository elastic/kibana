/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { registerCloudDeploymentMetadataAnalyticsContext } from '../common/register_cloud_deployment_id_analytics_context';
import type { CloudConfigType } from './config';
import { registerCloudUsageCollector } from './collectors';
import { getIsCloudEnabled } from '../common/is_cloud_enabled';
import { parseDeploymentIdFromDeploymentUrl } from './utils';
import { readInstanceSizeMb } from './env';

interface PluginsSetup {
  usageCollection?: UsageCollectionSetup;
}

/**
 * Setup contract
 */
export interface CloudSetup {
  /**
   * The deployment's Cloud ID. Only available when running on Elastic Cloud.
   */
  cloudId?: string;
  /**
   * The deployment's ID. Only available when running on Elastic Cloud.
   */
  deploymentId?: string;
  /**
   * `true` when running on Elastic Cloud.
   */
  isCloudEnabled: boolean;
  /**
   * The size of the instance in which Kibana is running. Only available when running on Elastic Cloud.
   */
  instanceSizeMb?: number;
  /**
   * When the Cloud Trial ends/ended for the organization that owns this deployment. Only available when running on Elastic Cloud.
   */
  trialEndDate?: Date;
  /**
   * `true` if the Elastic Cloud organization that owns this deployment is owned by an Elastician. Only available when running on Elastic Cloud.
   */
  isElasticStaffOwned?: boolean;
  /**
   * APM configuration keys.
   */
  apm: {
    url?: string;
    secretToken?: string;
  };
}

/**
 * Start contract
 */
export interface CloudStart {
  /**
   * `true` when running on Elastic Cloud.
   */
  isCloudEnabled: boolean;
}

export class CloudPlugin implements Plugin<CloudSetup, CloudStart> {
  private readonly config: CloudConfigType;

  constructor(private readonly context: PluginInitializerContext) {
    this.config = this.context.config.get<CloudConfigType>();
  }

  public setup(core: CoreSetup, { usageCollection }: PluginsSetup): CloudSetup {
    const isCloudEnabled = getIsCloudEnabled(this.config.id);
    registerCloudDeploymentMetadataAnalyticsContext(core.analytics, this.config);
    registerCloudUsageCollector(usageCollection, {
      isCloudEnabled,
      trialEndDate: this.config.trial_end_date,
      isElasticStaffOwned: this.config.is_elastic_staff_owned,
    });

    return {
      cloudId: this.config.id,
      instanceSizeMb: readInstanceSizeMb(),
      deploymentId: parseDeploymentIdFromDeploymentUrl(this.config.deployment_url),
      isCloudEnabled,
      trialEndDate: this.config.trial_end_date ? new Date(this.config.trial_end_date) : undefined,
      isElasticStaffOwned: this.config.is_elastic_staff_owned,
      apm: {
        url: this.config.apm?.url,
        secretToken: this.config.apm?.secret_token,
      },
    };
  }

  public start() {
    return {
      isCloudEnabled: getIsCloudEnabled(this.config.id),
    };
  }
}
