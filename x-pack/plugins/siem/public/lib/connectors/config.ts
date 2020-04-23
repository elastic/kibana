/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connector as serviceNowConnectorConfig } from './servicenow/config';
import { connector as jiraConnectorConfig } from './jira/config';

export const connectorsConfiguration = {
  '.servicenow': serviceNowConnectorConfig,
  '.jira': jiraConnectorConfig,
};
