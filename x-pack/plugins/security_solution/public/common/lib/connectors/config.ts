/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ServiceNowConnectorConfiguration } from '../../../../../triggers_actions_ui/public/common';
import { connector as jiraConnectorConfig } from './jira/config';
import { ConnectorConfiguration } from './types';

export const connectorsConfiguration: Record<string, ConnectorConfiguration> = {
  '.servicenow': ServiceNowConnectorConfiguration as ConnectorConfiguration,
  '.jira': jiraConnectorConfig,
};
