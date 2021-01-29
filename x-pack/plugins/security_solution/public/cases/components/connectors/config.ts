/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @kbn/eslint/no-restricted-paths */

import {
  ServiceNowITSMConnectorConfiguration,
  JiraConnectorConfiguration,
  ResilientConnectorConfiguration,
} from '../../../../../triggers_actions_ui/public/common';
import { ConnectorConfiguration } from './types';

export const connectorsConfiguration: Record<string, ConnectorConfiguration> = {
  '.servicenow': ServiceNowITSMConnectorConfiguration as ConnectorConfiguration,
  '.jira': JiraConnectorConfiguration as ConnectorConfiguration,
  '.resilient': ResilientConnectorConfiguration as ConnectorConfiguration,
};
