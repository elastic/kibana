/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';

export interface CloudStart {
  /**
   * A React component that provides a pre-wired `React.Context` which connects components to Cloud services.
   */
  CloudContextProvider: FC<{}>;
  /**
   * `true` when Kibana is running on Elastic Cloud.
   */
  isCloudEnabled: boolean;
  /**
   * Cloud ID. Undefined if not running on Cloud.
   */
  cloudId?: string;
  /**
   * The full URL to the deployment management page on Elastic Cloud. Undefined if not running on Cloud.
   */
  deploymentUrl?: string;
  /**
   * The full URL to the user profile page on Elastic Cloud. Undefined if not running on Cloud.
   */
  profileUrl?: string;
  /**
   * The full URL to the billing page on Elastic Cloud. Undefined if not running on Cloud.
   */
  billingUrl?: string;
  /**
   * The full URL to the organization management page on Elastic Cloud. Undefined if not running on Cloud.
   */
  organizationUrl?: string;
  /**
   * The full URL to the performance page on Elastic Cloud. Undefined if not running on Cloud.
   */
  performanceUrl?: string;
  /**
   * The full URL to the users and roles page on Elastic Cloud. Undefined if not running on Cloud.
   */
  usersAndRolesUrl?: string;
  /**
   * The full URL to the elasticsearch cluster.
   */
  elasticsearchUrl?: string;
  /**
   * The full URL to the Kibana deployment.
   */
  kibanaUrl?: string;
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

export interface CloudSetup {
  /**
   * Cloud ID. Undefined if not running on Cloud.
   */
  cloudId?: string;
  /**
   * The deployment's ID. Only available when running on Elastic Cloud.
   */
  deploymentId?: string;
  /**
   * This value is the same as `baseUrl` on ESS but can be customized on ECE.
   */
  cname?: string;
  /**
   * This is the URL of the Cloud interface.
   */
  baseUrl?: string;
  /**
   * The full URL to the deployment management page on Elastic Cloud. Undefined if not running on Cloud.
   */
  deploymentUrl?: string;
  /**
   * The full URL to the user profile page on Elastic Cloud. Undefined if not running on Cloud.
   */
  profileUrl?: string;
  /**
   * The full URL to the organization management page on Elastic Cloud. Undefined if not running on Cloud.
   */
  organizationUrl?: string;
  /**
   * This is the path to the Snapshots page for the deployment to which the Kibana instance belongs. The value is already prepended with `deploymentUrl`.
   */
  snapshotsUrl?: string;
  /**
   * The full URL to the elasticsearch cluster.
   */
  elasticsearchUrl?: string;
  /**
   * The full URL to the Kibana deployment.
   */
  kibanaUrl?: string;
  /**
   * {host} from the deployment url https://<deploymentId>.<application>.<host><?:port>
   */
  cloudHost?: string;
  /**
   * {port} from the deployment url https://<deploymentId>.<application>.<host><?:port>
   */
  cloudDefaultPort?: string;
  /**
   * `true` when Kibana is running on Elastic Cloud.
   */
  isCloudEnabled: boolean;
  /**
   * When the Cloud Trial ends/ended for the organization that owns this deployment. Only available when running on Elastic Cloud.
   */
  trialEndDate?: Date;
  /**
   * `true` if the Elastic Cloud organization that owns this deployment is owned by an Elastician. Only available when running on Elastic Cloud.
   */
  isElasticStaffOwned?: boolean;
  /**
   * Registers CloudServiceProviders so start's `CloudContextProvider` hooks them.
   * @param contextProvider The React component from the Service Provider.
   */
  registerCloudService: (contextProvider: FC) => void;
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
