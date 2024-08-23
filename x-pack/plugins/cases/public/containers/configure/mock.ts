/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfigurationRequest } from '../../../common/types/api';
import type { Configuration } from '../../../common/types/domain';
import { ConnectorTypes } from '../../../common/types/domain';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import type { CaseConnectorMapping } from './types';
import type { CasesConfigurationUI } from '../types';
import { customFieldsConfigurationMock, templatesConfigurationMock } from '../mock';

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

export const caseConfigurationResponseMock: Configuration = {
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
  customFields: customFieldsConfigurationMock,
  templates: templatesConfigurationMock,
};

export const caseConfigurationRequest: ConfigurationRequest = {
  connector: {
    id: '123',
    name: 'My connector',
    type: ConnectorTypes.jira,
    fields: null,
  },
  owner: SECURITY_SOLUTION_OWNER,
  closure_type: 'close-by-user',
};

export const casesConfigurationsMock: CasesConfigurationUI = {
  id: '123',
  connector: {
    id: '123',
    name: 'My connector',
    type: ConnectorTypes.jira,
    fields: null,
  },
  closureType: 'close-by-pushing',
  mappings: [],
  version: 'WzHJ12',
  customFields: customFieldsConfigurationMock,
  templates: templatesConfigurationMock,
  owner: 'securitySolution',
};
