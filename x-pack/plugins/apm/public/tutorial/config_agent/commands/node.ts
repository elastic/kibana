/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const nodeVariables = {
  apmServiceName: 'serviceName',
  secretToken: 'secretToken',
  apmServerUrl: 'serverUrl',
  apmEnvironment: 'environment',
};

export const node = `// ${i18n.translate(
  'xpack.apm.tutorial.nodeClient.configure.commands.addThisToTheFileTopComment',
  {
    defaultMessage:
      'Add this to the VERY top of the first file loaded in your app',
  }
)}
var apm = require('elastic-apm-node').start({

  // ${i18n.translate(
    'xpack.apm.tutorial.nodeClient.configure.commands.setRequiredServiceNameComment',
    {
      defaultMessage: 'Override the service name from package.json',
    }
  )}
  // ${i18n.translate(
    'xpack.apm.tutorial.nodeClient.configure.commands.allowedCharactersComment',
    {
      defaultMessage: 'Allowed characters: a-z, A-Z, 0-9, -, _, and space',
    }
  )}
  ${nodeVariables.apmServiceName}: '{{{apmServiceName}}}',

  // ${i18n.translate(
    'xpack.apm.tutorial.nodeClient.configure.commands.useIfApmRequiresTokenComment',
    {
      defaultMessage: 'Use if APM Server requires a secret token',
    }
  )}
  ${nodeVariables.secretToken}: '{{{secretToken}}}',

  // ${i18n.translate(
    'xpack.apm.tutorial.nodeClient.configure.commands.setCustomApmServerUrlComment',
    {
      defaultMessage:
        'Set the custom APM Server URL (default: {defaultApmServerUrl})',
      values: { defaultApmServerUrl: 'http://localhost:8200' },
    }
  )}
  ${nodeVariables.apmServerUrl}: '{{{apmServerUrl}}}',

  // ${i18n.translate(
    'xpack.apm.tutorial.nodeClient.configure.commands.setCustomServiceEnvironmentComment',
    {
      defaultMessage: 'Set the service environment',
    }
  )}
  ${nodeVariables.apmEnvironment}: '{{{apmEnvironment}}}'
})`;
