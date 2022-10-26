/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const goVariables = {
  apmServiceName: 'ELASTIC_APM_SERVICE_NAME',
  secretToken: 'ELASTIC_APM_SECRET_TOKEN',
  apmServerUrl: 'ELASTIC_APM_SERVER_URL',
  apmEnvironment: 'ELASTIC_APM_ENVIRONMENT',
};

export const go = `# ${i18n.translate(
  'xpack.apm.tutorial.goClient.configure.commands.initializeUsingEnvironmentVariablesComment',
  {
    defaultMessage: 'Initialize using environment variables:',
  }
)}

# ${i18n.translate(
  'xpack.apm.tutorial.goClient.configure.commands.setServiceNameComment',
  {
    defaultMessage:
      'Set the service name. Allowed characters: # a-z, A-Z, 0-9, -, _, and space.',
  }
)}
# ${i18n.translate(
  'xpack.apm.tutorial.goClient.configure.commands.usedExecutableNameComment',
  {
    defaultMessage:
      'If ELASTIC_APM_SERVICE_NAME is not specified, the executable name will be used.',
  }
)}
export ${goVariables.apmServiceName}={{{apmServiceName}}}

# ${i18n.translate(
  'xpack.apm.tutorial.goClient.configure.commands.useIfApmRequiresTokenComment',
  {
    defaultMessage: 'Use if APM Server requires a secret token',
  }
)}
export ${goVariables.secretToken}={{{secretToken}}}

# ${i18n.translate(
  'xpack.apm.tutorial.goClient.configure.commands.setCustomApmServerUrlComment',
  {
    defaultMessage:
      'Set custom APM Server URL (default: {defaultApmServerUrl})',
    values: { defaultApmServerUrl: 'http://localhost:8200' },
  }
)}
export ${goVariables.apmServerUrl}={{{apmServerUrl}}}

# ${i18n.translate(
  'xpack.apm.tutorial.goClient.configure.commands.setServiceEnvironment',
  {
    defaultMessage: 'Set the service environment',
  }
)}
export ${goVariables.apmEnvironment}={{{apmEnvironment}}}
`;
