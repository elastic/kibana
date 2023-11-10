/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import type { Logger } from '@kbn/logging';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { registerCloudDeploymentMetadataAnalyticsContext } from '../common/register_cloud_deployment_id_analytics_context';
import { getIsCloudEnabled } from '../common/is_cloud_enabled';
import { parseDeploymentIdFromDeploymentUrl } from '../common/parse_deployment_id_from_deployment_url';
import { ELASTIC_SUPPORT_LINK, CLOUD_SNAPSHOTS_PATH } from '../common/constants';
import { decodeCloudId, type DecodedCloudId } from '../common/decode_cloud_id';
import type { CloudSetup, CloudStart } from './types';
import { getFullCloudUrl } from '../common/utils';

export interface CloudConfigType {
  id?: string;
  cname?: string;
  base_url?: string;
  profile_url?: string;
  deployment_url?: string;
  projects_url?: string;
  billing_url?: string;
  organization_url?: string;
  users_and_roles_url?: string;
  performance_url?: string;
  trial_end_date?: string;
  is_elastic_staff_owned?: boolean;
  serverless?: {
    project_id: string;
    project_name?: string;
    project_type?: string;
  };
}

interface CloudUrls {
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
  private readonly contextProviders: FC[] = [];
  private readonly logger: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<CloudConfigType>();
    this.isCloudEnabled = getIsCloudEnabled(this.config.id);
    this.isServerlessEnabled = !!this.config.serverless?.project_id;
    this.logger = initializerContext.logger.get();
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
      deploymentId: parseDeploymentIdFromDeploymentUrl(this.config.deployment_url),
      cname,
      baseUrl,
      ...this.getCloudUrls(),
      elasticsearchUrl: decodedId?.elasticsearchUrl,
      kibanaUrl: decodedId?.kibanaUrl,
      cloudHost: decodedId?.host,
      cloudDefaultPort: decodedId?.defaultPort,
      trialEndDate: trialEndDate ? new Date(trialEndDate) : undefined,
      isElasticStaffOwned,
      isCloudEnabled: this.isCloudEnabled,
      isServerlessEnabled: this.isServerlessEnabled,
      serverless: {
        projectId: this.config.serverless?.project_id,
        projectName: this.config.serverless?.project_name,
        projectType: this.config.serverless?.project_type,
      },
      registerCloudService: (contextProvider) => {
        this.contextProviders.push(contextProvider);
      },
    };
  }

  public start(coreStart: CoreStart): CloudStart {
    coreStart.chrome.setHelpSupportUrl(ELASTIC_SUPPORT_LINK);

    // Nest all the registered context providers under the Cloud Services Provider.
    // This way, plugins only need to require Cloud's context provider to have all the enriched Cloud services.
    const CloudContextProvider: FC = ({ children }) => {
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
      deploymentUrl,
      profileUrl,
      organizationUrl,
      projectsUrl,
      elasticsearchUrl: decodedId?.elasticsearchUrl,
      kibanaUrl: decodedId?.kibanaUrl,
      isServerlessEnabled: this.isServerlessEnabled,
      serverless: {
        projectId: this.config.serverless?.project_id,
        projectName: this.config.serverless?.project_name,
        projectType: this.config.serverless?.project_type,
      },
      performanceUrl,
      usersAndRolesUrl,
    };
  }

  public stop() {}

  private getCloudUrls(): CloudUrls {
    const {
      profile_url: profileUrl,
      billing_url: billingUrl,
      organization_url: organizationUrl,
      deployment_url: deploymentUrl,
      base_url: baseUrl,
      performance_url: performanceUrl,
      users_and_roles_url: usersAndRolesUrl,
      projects_url: projectsUrl,
    } = this.config;

    const fullCloudDeploymentUrl = getFullCloudUrl(baseUrl, deploymentUrl);
    const fullCloudProfileUrl = getFullCloudUrl(baseUrl, profileUrl);
    const fullCloudBillingUrl = getFullCloudUrl(baseUrl, billingUrl);
    const fullCloudOrganizationUrl = getFullCloudUrl(baseUrl, organizationUrl);
    const fullCloudPerformanceUrl = getFullCloudUrl(baseUrl, performanceUrl);
    const fullCloudUsersAndRolesUrl = getFullCloudUrl(baseUrl, usersAndRolesUrl);
    const fullCloudProjectsUrl = getFullCloudUrl(baseUrl, projectsUrl);
    const fullCloudSnapshotsUrl = `${fullCloudDeploymentUrl}/${CLOUD_SNAPSHOTS_PATH}`;

    return {
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
}
