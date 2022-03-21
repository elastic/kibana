/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionConnector, ActionTypeConnector } from '../../../common/api';

export const connectorsMock: ActionConnector[] = [
  {
    id: 'servicenow-1',
    actionTypeId: '.servicenow',
    name: 'My Connector',
    config: {
      apiUrl: 'https://instance1.service-now.com',
    },
    isPreconfigured: false,
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
  },
  {
    id: 'jira-1',
    actionTypeId: '.jira',
    name: 'Jira',
    config: {
      apiUrl: 'https://instance.atlassian.ne',
    },
    isPreconfigured: false,
  },
  {
    id: 'servicenow-sir',
    actionTypeId: '.servicenow-sir',
    name: 'My Connector SIR',
    config: {
      apiUrl: 'https://instance1.service-now.com',
    },
    isPreconfigured: false,
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
  },
  {
    id: '.index',
    name: 'Index',
    minimumLicenseRequired: 'basic',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
  },
  {
    id: '.servicenow',
    name: 'ServiceNow',
    minimumLicenseRequired: 'platinum',
    enabled: false,
    enabledInConfig: true,
    enabledInLicense: true,
  },
  {
    id: '.jira',
    name: 'Jira',
    minimumLicenseRequired: 'gold',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
  },
  {
    id: '.resilient',
    name: 'IBM Resilient',
    minimumLicenseRequired: 'platinum',
    enabled: false,
    enabledInConfig: true,
    enabledInLicense: true,
  },
  {
    id: '.servicenow-sir',
    name: 'ServiceNow SIR',
    minimumLicenseRequired: 'platinum',
    enabled: false,
    enabledInConfig: true,
    enabledInLicense: true,
  },
];
