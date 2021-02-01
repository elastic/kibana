/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  ActionTypeConnector,
  CasePostRequest,
  CasesConfigureRequest,
  ConnectorTypes,
  PostPushRequest,
} from '../../../../common/api';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { FindActionResult } from '../../../../../actions/server/types';
import { params } from '../cases/configure/mock';

export const newCase: CasePostRequest = {
  title: 'My new case',
  description: 'A description',
  tags: ['new', 'case'],
  connector: {
    id: 'none',
    name: 'none',
    type: ConnectorTypes.none,
    fields: null,
  },
  settings: {
    syncAlerts: true,
  },
};

export const getActions = (): FindActionResult[] => [
  {
    id: 'e90075a5-c386-41e3-ae21-ba4e61510695',
    actionTypeId: '.webhook',
    name: 'Test',
    config: {
      method: 'post',
      url: 'https://example.com',
      headers: null,
    },
    isPreconfigured: false,
    referencedByCount: 0,
  },
  {
    id: '123',
    actionTypeId: '.servicenow',
    name: 'ServiceNow',
    config: {
      apiUrl: 'https://dev102283.service-now.com',
    },
    isPreconfigured: false,
    referencedByCount: 0,
  },
  {
    id: '456',
    actionTypeId: '.jira',
    name: 'Connector without isCaseOwned',
    config: {
      apiUrl: 'https://elastic.jira.com',
    },
    isPreconfigured: false,
    referencedByCount: 0,
  },
  {
    id: '789',
    actionTypeId: '.resilient',
    name: 'Connector without mapping',
    config: {
      apiUrl: 'https://elastic.resilient.com',
    },
    isPreconfigured: false,
    referencedByCount: 0,
  },
];

export const getActionTypes = (): ActionTypeConnector[] => [
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
];

export const newConfiguration: CasesConfigureRequest = {
  connector: {
    id: '456',
    name: 'My connector 2',
    type: ConnectorTypes.jira,
    fields: null,
  },
  closure_type: 'close-by-pushing',
};

export const newPostPushRequest: PostPushRequest = {
  params: params[ConnectorTypes.jira],
  connector_type: ConnectorTypes.jira,
};

export const executePushResponse = {
  status: 'ok',
  data: {
    title: 'RJ2-200',
    id: '10663',
    pushedDate: '2020-12-17T00:32:40.738Z',
    url: 'https://siem-kibana.atlassian.net/browse/RJ2-200',
    comments: [],
  },
};
