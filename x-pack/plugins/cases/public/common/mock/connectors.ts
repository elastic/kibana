/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import type { ActionConnector, ActionTypeConnector } from '../../../common/api';
import { basicPush } from '../../containers/mock';
import type { CaseConnectors } from '../../containers/types';

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

/**
 * Construct a mock getConnectors response object
 *
 * @param overrides is an object where the key is the path for setting a field in the returned object. For example to set
 *  the externalService.connectorId pass the following overrides object:
 *
 * ```
 *    {
 *      'push.details.externalService.connectorId': '123'
 *    }
 * ```
 */
export const getCaseConnectorsMockResponse = (
  overrides?: Record<string, unknown>
): CaseConnectors => {
  return connectorsMock.reduce((acc, connector) => {
    const newConnectors: CaseConnectors = {
      ...acc,
      [connector.id]: {
        id: connector.id,
        name: connector.name,
        type: connector.actionTypeId,
        fields: null,
        push: {
          needsToBePushed: false,
          hasBeenPushed: true,
          details: {
            oldestUserActionPushDate: '2023-01-17T09:46:29.813Z',
            latestUserActionPushDate: '2023-01-17T09:46:29.813Z',
            externalService: {
              ...basicPush,
              connectorId: connector.id,
              connectorName: connector.name,
            },
          },
        },
      },
    };

    if (overrides != null) {
      for (const path of Object.keys(overrides)) {
        set(newConnectors[connector.id], path, overrides[path]);
      }
    }

    return newConnectors;
  }, {});
};
