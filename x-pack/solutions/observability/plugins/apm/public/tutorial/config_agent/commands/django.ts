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

export const djangoVariables = {
  apmServiceName: 'SERVICE_NAME',
  secretToken: 'SECRET_TOKEN',
  apmServerUrl: 'SERVER_URL',
  apmEnvironment: 'ENVIRONMENT',
};

export const djangoHighlightLang = 'py';

const djangoAddAgentComment = i18n.translate(
  'xpack.apm.tutorial.djangoClient.configure.commands.addAgentComment',
  {
    defaultMessage: 'Add the agent to installed apps',
  }
);

const djangoTracingMiddlewareComment = i18n.translate(
  'xpack.apm.tutorial.djangoClient.configure.commands.addTracingMiddlewareComment',
  {
    defaultMessage: 'Add our tracing middleware to send performance metrics',
  }
);

export const djangoLineNumbers = {
  start: 1,
  highlight: '1-4, 7, 9, 11, 13, 16-19',
  annotations: {
    2: djangoAddAgentComment,
    7: serviceNameHint,
    9: secretTokenHint,
    11: serverUrlHint,
    13: serviceEnvironmentHint,
    17: djangoTracingMiddlewareComment,
  },
};

export const django = `INSTALLED_APPS = (
  'elasticapm.contrib.django',
  # ...
)

ELASTIC_APM = {
  '${djangoVariables.apmServiceName}': '{{{apmServiceName}}}',

  '${djangoVariables.secretToken}': '{{{secretToken}}}',

  '${djangoVariables.apmServerUrl}': '{{{apmServerUrl}}}',

  '${djangoVariables.apmEnvironment}': '{{{apmEnvironment}}}',
}

MIDDLEWARE = (
  'elasticapm.contrib.django.middleware.TracingMiddleware',
  #...
)`;
