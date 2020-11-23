/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ActionConnector,
  CasesConfigureResponse,
  CasesConfigureRequest,
  ConnectorTypes,
} from '../../../../../case/common/api';
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
  mappings,
  updatedAt: '2020-04-06T14:03:18.657Z',
  updatedBy: { username: 'elastic', fullName: 'Elastic', email: 'elastic@elastic.co' },
  version: 'WzHJ12',
};
