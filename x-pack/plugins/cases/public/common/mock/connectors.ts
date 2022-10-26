/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionConnector, ActionTypeConnector } from '../../../common/api';

export const connectorsMock: ActionConnector[] = [
  {
    id: 'servicenow-1',
    actionTypeId: '.servicenow',
    name: 'My Connector',
    config: {
      apiUrl: 'https://instance1.service-now.com',
    },
    isPreconfigured: false,
    isDeprecated: false,
  },
  {
    id: 'resilient-2',
    actionTypeId: '.resilient',
    name: 'My Connector 2',
    config: {
      apiUrl: 'https://test/',
      orgId: '201',
    },
    isPreconfigured: false,
    isDeprecated: false,
  },
  {
    id: 'jira-1',
    actionTypeId: '.jira',
    name: 'Jira',
    config: {
      apiUrl: 'https://instance.atlassian.ne',
    },
    isPreconfigured: false,
    isDeprecated: false,
  },
  {
    id: 'servicenow-sir',
    actionTypeId: '.servicenow-sir',
    name: 'My Connector SIR',
    config: {
      apiUrl: 'https://instance1.service-now.com',
    },
    isPreconfigured: false,
    isDeprecated: false,
  },
  {
    id: 'servicenow-uses-table-api',
    actionTypeId: '.servicenow',
    name: 'My Connector',
    config: {
      apiUrl: 'https://instance1.service-now.com',
      usesTableApi: true,
    },
    isPreconfigured: false,
    isDeprecated: true,
  },
];

export const actionTypesMock: ActionTypeConnector[] = [
  {
    id: '.email',
    name: 'Email',
    minimumLicenseRequired: 'gold',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    supportedFeatureIds: ['alerting'],
  },
  {
    id: '.index',
    name: 'Index',
    minimumLicenseRequired: 'basic',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    supportedFeatureIds: ['alerting'],
  },
  {
    id: '.servicenow',
    name: 'ServiceNow',
    minimumLicenseRequired: 'platinum',
    enabled: false,
    enabledInConfig: true,
    enabledInLicense: true,
    supportedFeatureIds: ['alerting', 'cases'],
  },
  {
    id: '.jira',
    name: 'Jira',
    minimumLicenseRequired: 'gold',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    supportedFeatureIds: ['alerting', 'cases'],
  },
  {
    id: '.resilient',
    name: 'IBM Resilient',
    minimumLicenseRequired: 'platinum',
    enabled: false,
    enabledInConfig: true,
    enabledInLicense: true,
    supportedFeatureIds: ['alerting', 'cases'],
  },
  {
    id: '.servicenow-sir',
    name: 'ServiceNow SIR',
    minimumLicenseRequired: 'platinum',
    enabled: false,
    enabledInConfig: true,
    enabledInLicense: true,
    supportedFeatureIds: ['alerting', 'cases'],
  },
];
