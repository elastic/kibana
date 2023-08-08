/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { registerCloudDeploymentMetadataAnalyticsContext } from '../common/register_cloud_deployment_id_analytics_context';
import type { CloudConfigType } from './config';
import { registerCloudUsageCollector } from './collectors';
import { getIsCloudEnabled } from '../common/is_cloud_enabled';
import { parseDeploymentIdFromDeploymentUrl } from '../common/parse_deployment_id_from_deployment_url';
import { decodeCloudId, DecodedCloudId } from '../common/decode_cloud_id';
import { getFullCloudUrl } from '../common/utils';
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
   * The full URL to the elasticsearch cluster.
   */
  elasticsearchUrl?: string;
  /**
   * The full URL to the Kibana deployment.
   */
  kibanaUrl?: string;
  /**
   * The full URL to the serverless projects.
   */
  projectsUrl?: string;
  /**
   * The full URL to cloud/serverless.
   */
  baseUrl?: string;
  /**
   * {host} from the deployment url https://<deploymentId>.<application>.<host><?:port>
   */
  cloudHost?: string;
  /**
   * {port} from the deployment url https://<deploymentId>.<application>.<host><?:port>
   */
  cloudDefaultPort?: string;
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
  /**
   * `true` when running on Serverless Elastic Cloud
   * Note that `isCloudEnabled` will always be true when `isServerlessEnabled` is.
   */
  isServerlessEnabled: boolean;
  /**
   * Serverless configuration
   */
  serverless: {
    /**
     * The serverless projectId.
     * Will always be present if `isServerlessEnabled` is `true`
     */
    projectId?: string;
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
  /**
   * The full URL to the serverless projects.
   */
  projectsUrl?: string;
  /**
   * The full URL to cloud/serverless.
   */
  baseUrl?: string;
}

export class CloudPlugin implements Plugin<CloudSetup, CloudStart> {
  private readonly config: CloudConfigType;
  private readonly logger: Logger;

  constructor(private readonly context: PluginInitializerContext) {
    this.config = this.context.config.get<CloudConfigType>();
    this.logger = this.context.logger.get();
  }

  public setup(core: CoreSetup, { usageCollection }: PluginsSetup): CloudSetup {
    const isCloudEnabled = getIsCloudEnabled(this.config.id);
    const isServerlessEnabled = !!this.config.serverless?.project_id;

    registerCloudDeploymentMetadataAnalyticsContext(core.analytics, this.config);
    registerCloudUsageCollector(usageCollection, {
      isCloudEnabled,
      trialEndDate: this.config.trial_end_date,
      isElasticStaffOwned: this.config.is_elastic_staff_owned,
    });

    let decodedId: DecodedCloudId | undefined;
    if (this.config.id) {
      decodedId = decodeCloudId(this.config.id, this.logger);
    }

    return {
      ...this.getCloudUrls(),
      cloudId: this.config.id,
      instanceSizeMb: readInstanceSizeMb(),
      deploymentId: parseDeploymentIdFromDeploymentUrl(this.config.deployment_url),
      elasticsearchUrl: decodedId?.elasticsearchUrl,
      kibanaUrl: decodedId?.kibanaUrl,
      cloudHost: decodedId?.host,
      cloudDefaultPort: decodedId?.defaultPort,
      isCloudEnabled,
      trialEndDate: this.config.trial_end_date ? new Date(this.config.trial_end_date) : undefined,
      isElasticStaffOwned: this.config.is_elastic_staff_owned,
      apm: {
        url: this.config.apm?.url,
        secretToken: this.config.apm?.secret_token,
      },
      isServerlessEnabled,
      serverless: {
        projectId: this.config.serverless?.project_id,
      },
    };
  }

  public start(): CloudStart {
    return {
      ...this.getCloudUrls(),
      isCloudEnabled: getIsCloudEnabled(this.config.id),
    };
  }

  private getCloudUrls() {
    const { base_url: baseUrl } = this.config;
    const projectsUrl = getFullCloudUrl(this.config.base_url, this.config.projects_url);

    return {
      baseUrl,
      projectsUrl,
    };
  }
}
