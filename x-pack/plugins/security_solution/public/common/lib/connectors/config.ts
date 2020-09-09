/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @kbn/eslint/no-restricted-paths */

import {
  ServiceNowConnectorConfiguration,
  JiraConnectorConfiguration,
} from '../../../../../triggers_actions_ui/public/common';
import { connector as resilientConnectorConfig } from './resilient/config';
import { ConnectorConfiguration } from './types';

export const connectorsConfiguration: Record<string, ConnectorConfiguration> = {
  '.servicenow': ServiceNowConnectorConfiguration as ConnectorConfiguration,
  '.jira': JiraConnectorConfiguration as ConnectorConfiguration,
  '.resilient': resilientConnectorConfig,
};
