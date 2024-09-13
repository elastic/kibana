/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import type { Logger } from '@kbn/logging';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';

import { registerCloudDeploymentMetadataAnalyticsContext } from '../common/register_cloud_deployment_id_analytics_context';
import { getIsCloudEnabled } from '../common/is_cloud_enabled';
import { parseDeploymentIdFromDeploymentUrl } from '../common/parse_deployment_id_from_deployment_url';
import { CLOUD_SNAPSHOTS_PATH } from '../common/constants';
import { decodeCloudId, type DecodedCloudId } from '../common/decode_cloud_id';
import { getFullCloudUrl } from '../common/utils';
import { parseOnboardingSolution } from '../common/parse_onboarding_default_solution';
import type { CloudSetup, CloudStart, PublicElasticsearchConfigType } from './types';
import { getSupportUrl } from './utils';
import { ElasticsearchConfigType } from '../common/types';

export interface CloudConfigType {
  id?: string;
  organization_id?: string;
  cname?: string;
  base_url?: string;
  profile_url?: string;
  deployments_url?: string;
  deployment_url?: string;
  projects_url?: string;
  billing_url?: string;
  organization_url?: string;
  users_and_roles_url?: string;
  performance_url?: string;
  trial_end_date?: string;
  is_elastic_staff_owned?: boolean;
  onboarding?: {
    default_solution?: string;
  };
  serverless?: {
    project_id: string;
    project_name?: string;
    project_type?: string;
    orchestrator_target?: string;
  };
}

interface CloudUrls {
  /** Link to all deployments page on cloud */
  deploymentsUrl?: string;
  /** Link to the current deployment on cloud */
  deploymentUrl?: string;
  profileUrl?: string;
  billingUrl?: string;
  organizationUrl?: string;
  snapshotsUrl?: string;
  performanceUrl?: string;
  usersAndRolesUrl?: string;
  projectsUrl?: string;
}

export class CloudPlugin implements Plugin<CloudSetup> {
  private readonly config: CloudConfigType;
  private readonly isCloudEnabled: boolean;
  private readonly isServerlessEnabled: boolean;
  private readonly contextProviders: Array<FC<PropsWithChildren<unknown>>> = [];
  private readonly logger: Logger;
  private elasticsearchUrl?: string;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<CloudConfigType>();
    this.isCloudEnabled = getIsCloudEnabled(this.config.id);
    this.isServerlessEnabled = !!this.config.serverless?.project_id;
    this.logger = initializerContext.logger.get();
    this.elasticsearchUrl = undefined;
  }

  public setup(core: CoreSetup): CloudSetup {
    registerCloudDeploymentMetadataAnalyticsContext(core.analytics, this.config);

    const {
      id,
      cname,
      base_url: baseUrl,
      trial_end_date: trialEndDate,
      is_elastic_staff_owned: isElasticStaffOwned,
    } = this.config;

    let decodedId: DecodedCloudId | undefined;
    if (id) {
      decodedId = decodeCloudId(id, this.logger);
    }

    return {
      cloudId: id,
      organizationId: this.config.organization_id,
      deploymentId: parseDeploymentIdFromDeploymentUrl(this.config.deployment_url),
      cname,
      baseUrl,
      ...this.getCloudUrls(),
      kibanaUrl: decodedId?.kibanaUrl,
      cloudHost: decodedId?.host,
      cloudDefaultPort: decodedId?.defaultPort,
      trialEndDate: trialEndDate ? new Date(trialEndDate) : undefined,
      isElasticStaffOwned,
      isCloudEnabled: this.isCloudEnabled,
      onboarding: {
        defaultSolution: parseOnboardingSolution(this.config.onboarding?.default_solution),
      },
      isServerlessEnabled: this.isServerlessEnabled,
      serverless: {
        projectId: this.config.serverless?.project_id,
        projectName: this.config.serverless?.project_name,
        projectType: this.config.serverless?.project_type,
        orchestratorTarget: this.config.serverless?.orchestrator_target,
      },
      registerCloudService: (contextProvider) => {
        this.contextProviders.push(contextProvider);
      },
      fetchElasticsearchConfig: this.fetchElasticsearchConfig.bind(this, core.http),
    };
  }

  public start(coreStart: CoreStart): CloudStart {
    coreStart.chrome.setHelpSupportUrl(getSupportUrl(this.config));

    // Nest all the registered context providers under the Cloud Services Provider.
    // This way, plugins only need to require Cloud's context provider to have all the enriched Cloud services.
    const CloudContextProvider: FC<PropsWithChildren<unknown>> = ({ children }) => {
      return (
        <>
          {this.contextProviders.reduce(
            (acc, ContextProvider) => (
              <ContextProvider> {acc} </ContextProvider>
            ),
            children
          )}
        </>
      );
    };

    const {
      deploymentsUrl,
      deploymentUrl,
      profileUrl,
      billingUrl,
      organizationUrl,
      performanceUrl,
      usersAndRolesUrl,
      projectsUrl,
    } = this.getCloudUrls();

    let decodedId: DecodedCloudId | undefined;
    if (this.config.id) {
      decodedId = decodeCloudId(this.config.id, this.logger);
    }

    return {
      CloudContextProvider,
      isCloudEnabled: this.isCloudEnabled,
      cloudId: this.config.id,
      billingUrl,
      deploymentsUrl,
      deploymentUrl,
      profileUrl,
      organizationUrl,
      projectsUrl,
      kibanaUrl: decodedId?.kibanaUrl,
      isServerlessEnabled: this.isServerlessEnabled,
      serverless: {
        projectId: this.config.serverless?.project_id,
        projectName: this.config.serverless?.project_name,
        projectType: this.config.serverless?.project_type,
      },
      performanceUrl,
      usersAndRolesUrl,
      fetchElasticsearchConfig: this.fetchElasticsearchConfig.bind(
        this,
        coreStart.http,
        this.logger
      ),
    };
  }

  public stop() {}

  private getCloudUrls(): CloudUrls {
    const {
      profile_url: profileUrl,
      billing_url: billingUrl,
      organization_url: organizationUrl,
      deployments_url: deploymentsUrl,
      deployment_url: deploymentUrl,
      base_url: baseUrl,
      performance_url: performanceUrl,
      users_and_roles_url: usersAndRolesUrl,
      projects_url: projectsUrl,
    } = this.config;

    const fullCloudDeploymentsUrl = getFullCloudUrl(baseUrl, deploymentsUrl);
    const fullCloudDeploymentUrl = getFullCloudUrl(baseUrl, deploymentUrl);
    const fullCloudProfileUrl = getFullCloudUrl(baseUrl, profileUrl);
    const fullCloudBillingUrl = getFullCloudUrl(baseUrl, billingUrl);
    const fullCloudOrganizationUrl = getFullCloudUrl(baseUrl, organizationUrl);
    const fullCloudPerformanceUrl = getFullCloudUrl(baseUrl, performanceUrl);
    const fullCloudUsersAndRolesUrl = getFullCloudUrl(baseUrl, usersAndRolesUrl);
    const fullCloudProjectsUrl = getFullCloudUrl(baseUrl, projectsUrl);
    const fullCloudSnapshotsUrl = `${fullCloudDeploymentUrl}/${CLOUD_SNAPSHOTS_PATH}`;

    return {
      deploymentsUrl: fullCloudDeploymentsUrl,
      deploymentUrl: fullCloudDeploymentUrl,
      profileUrl: fullCloudProfileUrl,
      billingUrl: fullCloudBillingUrl,
      organizationUrl: fullCloudOrganizationUrl,
      snapshotsUrl: fullCloudSnapshotsUrl,
      performanceUrl: fullCloudPerformanceUrl,
      usersAndRolesUrl: fullCloudUsersAndRolesUrl,
      projectsUrl: fullCloudProjectsUrl,
    };
  }

  private async fetchElasticsearchConfig(
    http: CoreStart['http']
  ): Promise<PublicElasticsearchConfigType> {
    if (this.elasticsearchUrl) {
      return { elasticsearchUrl: this.elasticsearchUrl };
    }
    try {
      const result = await http.get<ElasticsearchConfigType>('/api/internal/elasticsearch_config');
      this.elasticsearchUrl = result.elasticsearch_url;
      return { elasticsearchUrl: result.elasticsearch_url };
    } catch {
      this.logger.error('Failed to fetch Elasticsearch config');
      return {
        elasticsearchUrl: undefined,
      };
    }
  }
}
