/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Connector,
  CasesConfigureResponse,
  CasesConfigureRequest,
} from '../../../../../case/common/api';
import { CaseConfigure, CasesConfigurationMapping } from './types';

export const mapping: CasesConfigurationMapping[] = [
  {
    source: 'title',
    target: 'short_description',
    actionType: 'overwrite',
  },
  {
    source: 'description',
    target: 'description',
    actionType: 'append',
  },
  {
    source: 'comments',
    target: 'comments',
    actionType: 'append',
  },
];
export const connectorsMock: Connector[] = [
  {
    id: 'servicenow-1',
    actionTypeId: '.servicenow',
    name: 'My Connector',
    config: {
      apiUrl: 'https://instance1.service-now.com',
      incidentConfiguration: {
        mapping,
      },
      isCaseOwned: true,
    },
    isPreconfigured: false,
  },
  {
    id: 'servicenow-2',
    actionTypeId: '.servicenow',
    name: 'My Connector 2',
    config: {
      apiUrl: 'https://instance2.service-now.com',
      incidentConfiguration: {
        mapping: [
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
        ],
      },
      isCaseOwned: true,
    },
    isPreconfigured: false,
  },
  {
    id: 'jira-1',
    actionTypeId: '.jira',
    name: 'Jira',
    config: {
      apiUrl: 'https://instance.atlassian.ne',
      casesConfiguration: {
        mapping: [
          {
            source: 'title',
            target: 'summary',
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
        ],
      },
    },
    isPreconfigured: false,
  },
];

export const caseConfigurationResposeMock: CasesConfigureResponse = {
  created_at: '2020-04-06T13:03:18.657Z',
  created_by: { username: 'elastic', full_name: 'Elastic', email: 'elastic@elastic.co' },
  connector_id: '123',
  connector_name: 'My Connector',
  closure_type: 'close-by-pushing',
  updated_at: '2020-04-06T14:03:18.657Z',
  updated_by: { username: 'elastic', full_name: 'Elastic', email: 'elastic@elastic.co' },
  version: 'WzHJ12',
};

export const caseConfigurationMock: CasesConfigureRequest = {
  connector_id: '123',
  connector_name: 'My Connector',
  closure_type: 'close-by-user',
};

export const caseConfigurationCamelCaseResponseMock: CaseConfigure = {
  createdAt: '2020-04-06T13:03:18.657Z',
  createdBy: { username: 'elastic', fullName: 'Elastic', email: 'elastic@elastic.co' },
  connectorId: '123',
  connectorName: 'My Connector',
  closureType: 'close-by-pushing',
  updatedAt: '2020-04-06T14:03:18.657Z',
  updatedBy: { username: 'elastic', fullName: 'Elastic', email: 'elastic@elastic.co' },
  version: 'WzHJ12',
};
