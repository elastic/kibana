/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

<<<<<<< HEAD:x-pack/plugins/siem/public/common/lib/connectors/config.ts
import { CasesConfigurationMapping } from '../../../cases/containers/configure/types';
import serviceNowLogo from './logos/servicenow.svg';
import { Connector } from './types';
=======
import { connector as serviceNowConnectorConfig } from './servicenow/config';
import { connector as jiraConnectorConfig } from './jira/config';
import { ConnectorConfiguration } from './types';
>>>>>>> b180fd378dbb622d01c8fefd0712a3c27ed59f39:x-pack/plugins/siem/public/lib/connectors/config.ts

export const connectorsConfiguration: Record<string, ConnectorConfiguration> = {
  '.servicenow': serviceNowConnectorConfig,
  '.jira': jiraConnectorConfig,
};
