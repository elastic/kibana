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

export const goVariables = {
  apmServiceName: 'ELASTIC_APM_SERVICE_NAME',
  secretToken: 'ELASTIC_APM_SECRET_TOKEN',
  apmServerUrl: 'ELASTIC_APM_SERVER_URL',
  apmEnvironment: 'ELASTIC_APM_ENVIRONMENT',
};

export const goHighlightLang = 'go';

const goServiceNameHint = i18n.translate(
  'xpack.apm.tutorial.goClient.configure.commands.usedExecutableNameComment',
  {
    defaultMessage: 'If not specified, the executable name will be used.',
  }
);

export const goLineNumbers = {
  start: 1,
  highlight: '2, 4, 6, 8',
  annotations: {
    2: `${serviceNameHint} ${goServiceNameHint}`,
    4: secretTokenHint,
    6: serverUrlHint,
    8: serviceEnvironmentHint,
  },
};

export const go = `# ${i18n.translate(
  'xpack.apm.tutorial.goClient.configure.commands.initializeUsingEnvironmentVariablesComment',
  {
    defaultMessage: 'Initialize using environment variables:',
  }
)}
export ${goVariables.apmServiceName}={{{apmServiceName}}}

export ${goVariables.secretToken}={{{secretToken}}}

export ${goVariables.apmServerUrl}={{{apmServerUrl}}}

export ${goVariables.apmEnvironment}={{{apmEnvironment}}}
`;
