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
import { getFullCloudUrl } from './utils';

export interface CloudConfigType {
  id?: string;
  cname?: string;
  base_url?: string;
  profile_url?: string;
  deployment_url?: string;
  organization_url?: string;
  trial_end_date?: string;
  is_elastic_staff_owned?: boolean;
}

interface CloudUrls {
  deploymentUrl?: string;
  profileUrl?: string;
  organizationUrl?: string;
  snapshotsUrl?: string;
}

export class CloudPlugin implements Plugin<CloudSetup> {
  private readonly config: CloudConfigType;
  private readonly isCloudEnabled: boolean;
  private readonly contextProviders: FC[] = [];
  private readonly logger: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<CloudConfigType>();
    this.isCloudEnabled = getIsCloudEnabled(this.config.id);
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

    const { deploymentUrl, profileUrl, organizationUrl } = this.getCloudUrls();

    return {
      CloudContextProvider,
      isCloudEnabled: this.isCloudEnabled,
      cloudId: this.config.id,
      deploymentUrl,
      profileUrl,
      organizationUrl,
    };
  }

  public stop() {}

  private getCloudUrls(): CloudUrls {
    const {
      profile_url: profileUrl,
      organization_url: organizationUrl,
      deployment_url: deploymentUrl,
      base_url: baseUrl,
    } = this.config;

    const fullCloudDeploymentUrl = getFullCloudUrl(baseUrl, deploymentUrl);
    const fullCloudProfileUrl = getFullCloudUrl(baseUrl, profileUrl);
    const fullCloudOrganizationUrl = getFullCloudUrl(baseUrl, organizationUrl);
    const fullCloudSnapshotsUrl = `${fullCloudDeploymentUrl}/${CLOUD_SNAPSHOTS_PATH}`;

    return {
      deploymentUrl: fullCloudDeploymentUrl,
      profileUrl: fullCloudProfileUrl,
      organizationUrl: fullCloudOrganizationUrl,
      snapshotsUrl: fullCloudSnapshotsUrl,
    };
  }
}
