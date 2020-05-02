/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CasesConfigurationMapping } from '../../containers/case/configure/types';

import { Connector } from './types';
import { connector as serviceNowConnectorConfig } from './servicenow/config';
import { connector as jiraConnectorConfig } from './jira/config';

export const connectorsConfiguration: Record<string, Connector> = {
  '.servicenow': serviceNowConnectorConfig,
  '.jira': jiraConnectorConfig,
};

export const defaultMapping: CasesConfigurationMapping[] = [
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
