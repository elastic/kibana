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
import type { OnBoardingDefaultSolution } from '../common';
import { getIsCloudEnabled } from '../common/is_cloud_enabled';
import { parseDeploymentIdFromDeploymentUrl } from '../common/parse_deployment_id_from_deployment_url';
import { decodeCloudId, DecodedCloudId } from '../common/decode_cloud_id';
import { parseOnboardingSolution } from '../common/parse_onboarding_default_solution';
import { getFullCloudUrl } from '../common/utils';
import { readInstanceSizeMb } from './env';
import { defineRoutes } from './routes/elasticsearch_routes';

interface PluginsSetup {
  usageCollection?: UsageCollectionSetup;
}

/**
 * Setup contract
 */
export interface CloudSetup {
  /**
   * This is the ID of the Cloud deployment to which the Kibana instance belongs.
   *
   * @example `eastus2.azure.elastic-cloud.com:9243$59ef636c6917463db140321484d63cfa$a8b109c08adc43279ef48f29af1a3911`
   *
   * @note The `cloudId` is a concatenation of the deployment name and a hash. Users can update the deployment name, changing the `cloudId`. However, the changed `cloudId` will not be re-injected into `kibana.yml`. If you need the current `cloudId` the best approach is to split the injected `cloudId` on the semi-colon, and replace the first element with the `persistent.cluster.metadata.display_name` value as provided by a call to `GET _cluster/settings`.
   */
  cloudId?: string;
  /**
   * The cloud service provider identifier.
   *
   * @note Expected to be one of `aws`, `gcp` or `azure`, but could be something different.
   */
  csp?: string;
  /**
   * The Elastic Cloud Organization that owns this deployment/project.
   */
  organizationId?: string;
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
   * This is the URL to the "projects" interface on cloud.
   *
   * @example `https://cloud.elastic.co/projects`
   */
  projectsUrl?: string;
  /**
   * This is the URL of the Cloud interface.
   *
   * @example `https://cloud.elastic.co` (on the ESS production environment)
   */
  baseUrl?: string;
  /**
   * {host} of the deployment url https://<deploymentId>.<application>.<host><?:port>
   */
  cloudHost?: string;
  /**
   * {port} of the deployment url https://<deploymentId>.<application>.<host><?:port>
   */
  cloudDefaultPort?: string;
  /**
   * This is set to `true` for both ESS and ECE deployments.
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
   * Onboarding configuration.
   */
  onboarding: {
    /**
     * The default solution selected during onboarding.
     */
    defaultSolution?: OnBoardingDefaultSolution;
  };
  /**
   * `true` when running on Serverless Elastic Cloud
   * Note that `isCloudEnabled` will always be true when `isServerlessEnabled` is.
   */
  isServerlessEnabled: boolean;
  /**
   * Serverless configuration.
   *
   * @note We decided to place any cloud URL values at the top level of this object
   *       even if they contain serverless specific values. All other serverless
   *       config should live in this object.
   */
  serverless: {
    /**
     * The serverless projectId.
     * Will always be present if `isServerlessEnabled` is `true`
     */
    projectId?: string;
    /**
     * The serverless project name.
     * Will always be present if `isServerlessEnabled` is `true`
     */
    projectName?: string;
    /**
     * The serverless project type.
     * Will always be present if `isServerlessEnabled` is `true`
     */
    projectType?: string;
    /**
     * The serverless orchestrator target. The potential values are `canary` or `non-canary`
     * Will always be present if `isServerlessEnabled` is `true`
     */
    orchestratorTarget?: string;
  };
}

/**
 * Start contract
 */
export interface CloudStart {
  /**
   * This is set to `true` for both ESS and ECE deployments.
   */
  isCloudEnabled: boolean;
  /**
   * This is the URL to the "projects" interface on cloud.
   *
   * @example `https://cloud.elastic.co/projects`
   */
  projectsUrl?: string;
  /**
   * This is the URL of the Cloud interface.
   *
   * @example `https://cloud.elastic.co` (on the ESS production environment)
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
    const organizationId = this.config.organization_id;
    const projectId = this.config.serverless?.project_id;
    const projectType = this.config.serverless?.project_type;
    const orchestratorTarget = this.config.serverless?.orchestrator_target;
    const isServerlessEnabled = !!projectId;
    const deploymentId = parseDeploymentIdFromDeploymentUrl(this.config.deployment_url);

    registerCloudDeploymentMetadataAnalyticsContext(core.analytics, this.config);
    registerCloudUsageCollector(usageCollection, {
      isCloudEnabled,
      organizationId,
      trialEndDate: this.config.trial_end_date,
      isElasticStaffOwned: this.config.is_elastic_staff_owned,
      deploymentId,
      projectId,
      projectType,
      orchestratorTarget,
    });

    let decodedId: DecodedCloudId | undefined;
    if (this.config.id) {
      decodedId = decodeCloudId(this.config.id, this.logger);
    }
    const router = core.http.createRouter();
    const elasticsearchUrl = core.elasticsearch.publicBaseUrl || decodedId?.elasticsearchUrl;
    defineRoutes({ logger: this.logger, router, elasticsearchUrl });

    return {
      ...this.getCloudUrls(),
      cloudId: this.config.id,
      csp: this.config.csp,
      organizationId,
      instanceSizeMb: readInstanceSizeMb(),
      deploymentId,
      elasticsearchUrl,
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
      onboarding: {
        defaultSolution: parseOnboardingSolution(this.config.onboarding?.default_solution),
      },
      isServerlessEnabled,
      serverless: {
        projectId,
        projectName: this.config.serverless?.project_name,
        projectType,
        orchestratorTarget,
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
    const projectsUrl = getFullCloudUrl(baseUrl, this.config.projects_url);
    return {
      baseUrl,
      projectsUrl,
    };
  }
}
