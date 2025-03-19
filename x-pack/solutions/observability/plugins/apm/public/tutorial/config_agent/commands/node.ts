/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import {
  serviceNameHint,
  secretTokenHint,
  serverUrlHint,
  serviceEnvironmentHint,
} from './shared_hints';

export const nodeVariables = {
  apmServiceName: 'serviceName',
  secretToken: 'secretToken',
  apmServerUrl: 'serverUrl',
  apmEnvironment: 'environment',
};

export const nodeHighlightLang = 'js';

const nodeServiceNameHint = i18n.translate(
  'xpack.apm.tutorial.nodeClient.createConfig.commands.serviceName',
  {
    defaultMessage: 'Overrides the service name in package.json.',
  }
);

export const nodeLineNumbers = {
  start: 1,
  highlight: '3, 5, 7, 9',
  annotations: {
    3: `${serviceNameHint} ${nodeServiceNameHint}`,
    5: secretTokenHint,
    7: serverUrlHint,
    9: serviceEnvironmentHint,
  },
};

export const node = `// ${i18n.translate(
  'xpack.apm.tutorial.nodeClient.configure.commands.addThisToTheFileTopComment',
  {
    defaultMessage: 'Add this to the very top of the first file loaded in your app',
  }
)}
var apm = require('elastic-apm-node').start({
  ${nodeVariables.apmServiceName}: '{{{apmServiceName}}}',

  ${nodeVariables.secretToken}: '{{{secretToken}}}',

  ${nodeVariables.apmServerUrl}: '{{{apmServerUrl}}}',

  ${nodeVariables.apmEnvironment}: '{{{apmEnvironment}}}'
})`;
