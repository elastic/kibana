/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesConfigureResponse, CasesConfigureRequest, ConnectorTypes } from '../../../common/api';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
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

export const caseConfigurationResposeMock: CasesConfigureResponse = {
  id: '123',
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
  owner: SECURITY_SOLUTION_OWNER,
  version: 'WzHJ12',
};

export const caseConfigurationMock: CasesConfigureRequest = {
  connector: {
    id: '123',
    name: 'My connector',
    type: ConnectorTypes.jira,
    fields: null,
  },
  owner: SECURITY_SOLUTION_OWNER,
  closure_type: 'close-by-user',
};

export const caseConfigurationCamelCaseResponseMock: CaseConfigure = {
  id: '123',
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
  owner: SECURITY_SOLUTION_OWNER,
};
