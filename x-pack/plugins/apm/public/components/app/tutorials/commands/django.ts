/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const djangoVariables = (apiKey?: string) => ({
  apmServiceName: 'SERVICE_NAME',
  ...(!apiKey && { secretToken: 'SECRET_TOKEN' }),
  ...(apiKey && { apiKey: 'API_KEY' }),
  apmServerUrl: 'SERVER_URL',
  apmEnvironment: 'ENVIRONMENT',
});

export const djangoHighlightLang = 'py';

export const djangoLineNumbers = (apiKey?: string) => ({
  start: 1,
  highlight: '1, 3, 5, 7, 9, 12, 15, 18-19,  21, 23, 25',
});

export const django = `INSTALLED_APPS = (
  # ${i18n.translate(
    'xpack.apm.tutorial.djangoClient.configure.commands.addAgentComment',
    {
      defaultMessage: 'Add the agent to installed apps',
    }
  )}
  'elasticapm.contrib.django',
  # ...
)

ELASTIC_APM = {
  # {{serviceNameHint}}
  'SERVICE_NAME': '{{{apmServiceName}}}',

  {{#apiKey}}
  # {{apiKeyHint}}
  'API_KEY': '{{{apiKey}}}',
  {{/apiKey}}
  {{^apiKey}}
  # {{secretTokenHint}}
  'SECRET_TOKEN': '{{{secretToken}}}',
  {{/apiKey}}

  # {{{serverUrlHint}}}
  'SERVER_URL': '{{{apmServerUrl}}}',

  # {{serviceEnvironmentHint}}
  'ENVIRONMENT': '{{{apmEnvironment}}}',
}

MIDDLEWARE = (
  # ${i18n.translate(
    'xpack.apm.tutorial.djangoClient.configure.commands.addTracingMiddlewareComment',
    {
      defaultMessage: 'Add our tracing middleware to send performance metrics',
    }
  )}
  'elasticapm.contrib.django.middleware.TracingMiddleware',
  #...
)`;
