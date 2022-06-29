/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  InstalledIntegrationArray,
  RelatedIntegrationArray,
} from '../../../../../common/detection_engine/schemas/common';

export const relatedIntegrations: RelatedIntegrationArray = [
  {
    package: 'system',
    version: '1.6.4',
  },
  {
    package: 'aws',
    integration: 'cloudtrail',
    version: '~1.11.0',
  },
];

export const installedIntegrationsBase: InstalledIntegrationArray = [
  { package_name: 'system', package_title: 'System', package_version: '1.6.4', is_enabled: true },
];

export const installedIntegrationsAWSCloudwatch: InstalledIntegrationArray = [
  {
    package_name: 'aws',
    package_title: 'AWS',
    package_version: '1.11.0',
    integration_name: 'billing',
    integration_title: 'AWS Billing Metrics',
    is_enabled: false,
  },
  {
    package_name: 'aws',
    package_title: 'AWS',
    package_version: '1.11.0',
    integration_name: 'cloudtrail',
    integration_title: 'AWS Cloudtrail Logs',
    is_enabled: false,
  },
  {
    package_name: 'aws',
    package_title: 'AWS',
    package_version: '1.11.0',
    integration_name: 'cloudwatch',
    integration_title: 'AWS CloudWatch',
    is_enabled: true,
  },
  { package_name: 'system', package_title: 'System', package_version: '1.6.4', is_enabled: true },
  {
    package_name: 'atlassian_bitbucket',
    package_title: 'Atlassian Bitbucket',
    package_version: '1.0.1',
    integration_name: 'audit',
    integration_title: 'Audit Logs',
    is_enabled: true,
  },
];
