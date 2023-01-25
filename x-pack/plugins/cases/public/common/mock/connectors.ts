/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionConnector,
  ActionTypeConnector,
  GetCaseConnectorsResponse,
} from '../../../common/api';

export const connectorsMock: ActionConnector[] = [
  {
    id: 'servicenow-1',
    actionTypeId: '.servicenow',
    name: 'My SN connector',
    config: {
      apiUrl: 'https://instance1.service-now.com',
    },
    isPreconfigured: false,
    isDeprecated: false,
  },
  {
    id: 'resilient-2',
    actionTypeId: '.resilient',
    name: 'My Resilient connector',
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
    name: 'My deprecated SN connector',
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

export const getCaseConnectorsMockResponse = (
  overrides: Record<string, Partial<GetCaseConnectorsResponse[string]>> = {}
): GetCaseConnectorsResponse => {
  return connectorsMock.reduce(
    (acc, connector) => ({
      ...acc,
      [connector.id]: {
        id: connector.id,
        name: connector.name,
        type: connector.actionTypeId,
        fields: null,
        needsToBePushed: false,
        oldestPushDate: '2023-01-17T09:46:29.813Z',
        latestPushDate: '2023-01-17T09:46:29.813Z',
        hasBeenPushed: true,
        ...overrides[connector.id],
      },
    }),
    {}
  );
};
