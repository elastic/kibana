/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActionConnector,
  ActionTypeConnector,
  CasesConfigureResponse,
  CasesConfigureRequest,
  ConnectorTypes,
} from '../../../common';
import { CaseConfigure, CaseConnectorMapping } from './types';

export const mappings: CaseConnectorMapping[] = [
  {
    source: 'title',
    target: 'short_description',
    actionType: 'overwrite',
  },
  {
    source: 'description',
    target: 'description',
    actionType: 'overwrite',
  },
  {
    source: 'comments',
    target: 'comments',
    actionType: 'append',
  },
];

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
];

export const caseConfigurationResposeMock: CasesConfigureResponse = {
  created_at: '2020-04-06T13:03:18.657Z',
  created_by: { username: 'elastic', full_name: 'Elastic', email: 'elastic@elastic.co' },
  connector: {
    id: '123',
    name: 'My connector',
    type: ConnectorTypes.jira,
    fields: null,
  },
  closure_type: 'close-by-pushing',
  error: null,
  mappings: [],
  updated_at: '2020-04-06T14:03:18.657Z',
  updated_by: { username: 'elastic', full_name: 'Elastic', email: 'elastic@elastic.co' },
  version: 'WzHJ12',
};

export const caseConfigurationMock: CasesConfigureRequest = {
  connector: {
    id: '123',
    name: 'My connector',
    type: ConnectorTypes.jira,
    fields: null,
  },
  closure_type: 'close-by-user',
};

export const caseConfigurationCamelCaseResponseMock: CaseConfigure = {
  createdAt: '2020-04-06T13:03:18.657Z',
  createdBy: { username: 'elastic', fullName: 'Elastic', email: 'elastic@elastic.co' },
  connector: {
    id: '123',
    name: 'My connector',
    type: ConnectorTypes.jira,
    fields: null,
  },
  closureType: 'close-by-pushing',
  error: null,
  mappings: [],
  updatedAt: '2020-04-06T14:03:18.657Z',
  updatedBy: { username: 'elastic', fullName: 'Elastic', email: 'elastic@elastic.co' },
  version: 'WzHJ12',
};
