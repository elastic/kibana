/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { API_KEY_COMMAND_PLACEHOLDER, SECRET_TOKEN_COMMAND_PLACEHOLDER } from './shared_hints';

export const djangoVariables = (secretToken?: string) => ({
  ...(secretToken && { secretToken: 'SECRET_TOKEN' }),
  ...(!secretToken && { apiKey: 'API_KEY' }),
  apmServerUrl: 'SERVER_URL',
});

export const djangoHighlightLang = 'py';

export const djangoLineNumbers = () => ({
  start: 1,
  highlight: '1, 3, 5, 7, 9, 12, 15, 18-19, 21, 23, 25',
});

export const django = `INSTALLED_APPS = (
  # ${i18n.translate('xpack.apm.onboarding.djangoClient.configure.commands.addAgentComment', {
    defaultMessage: 'Add the agent to installed apps',
  })}
  'elasticapm.contrib.django',
  # ...
)

ELASTIC_APM = {
  # {{serviceNameHint}}
  'SERVICE_NAME': '<your-service-name>',

  {{^secretToken}}
  # {{apiKeyHint}}
  'API_KEY': '${API_KEY_COMMAND_PLACEHOLDER}',
  {{/secretToken}}
  {{#secretToken}}
  # {{secretTokenHint}}
  'SECRET_TOKEN': '${SECRET_TOKEN_COMMAND_PLACEHOLDER}',
  {{/secretToken}}

  # {{{serverUrlHint}}}
  'SERVER_URL': '{{{apmServerUrl}}}',

  # {{{serviceEnvironmentHint}}}
  'ENVIRONMENT': '<your-environment>',
}

MIDDLEWARE = (
  # ${i18n.translate(
    'xpack.apm.onboarding.djangoClient.configure.commands.addTracingMiddlewareComment',
    {
      defaultMessage: 'Add our tracing middleware to send performance metrics',
    }
  )}
  'elasticapm.contrib.django.middleware.TracingMiddleware',
  #...
)`;
