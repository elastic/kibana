/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const django = `# ${i18n.translate(
  'xpack.apm.tutorial.djangoClient.configure.commands.addAgentComment',
  {
    defaultMessage: 'Add the agent to the installed apps',
  }
)}
INSTALLED_APPS = (
'elasticapm.contrib.django',
# ...
)

ELASTIC_APM = {
# ${i18n.translate(
  'xpack.apm.tutorial.djangoClient.configure.commands.setRequiredServiceNameComment',
  {
    defaultMessage: 'Set the required service name. Allowed characters:',
  }
)}
# ${i18n.translate(
  'xpack.apm.tutorial.djangoClient.configure.commands.allowedCharactersComment',
  {
    defaultMessage: 'a-z, A-Z, 0-9, -, _, and space',
  }
)}
'SERVICE_NAME': '',

# ${i18n.translate(
  'xpack.apm.tutorial.djangoClient.configure.commands.useIfApmServerRequiresTokenComment',
  {
    defaultMessage: 'Use if APM Server requires a secret token',
  }
)}
'SECRET_TOKEN': '{{{secretToken}}}',

# ${i18n.translate(
  'xpack.apm.tutorial.djangoClient.configure.commands.setCustomApmServerUrlComment',
  {
    defaultMessage:
      'Set the custom APM Server URL (default: {defaultApmServerUrl})',
    values: { defaultApmServerUrl: 'http://localhost:8200' },
  }
)}
'SERVER_URL': '{{{apmServerUrl}}}',

# ${i18n.translate(
  'xpack.apm.tutorial.djangoClient.configure.commands.setServiceEnvironmentComment',
  {
    defaultMessage: 'Set the service environment',
  }
)}
'ENVIRONMENT': 'production',
}

# ${i18n.translate(
  'xpack.apm.tutorial.djangoClient.configure.commands.addTracingMiddlewareComment',
  {
    defaultMessage: 'To send performance metrics, add our tracing middleware:',
  }
)}
MIDDLEWARE = (
'elasticapm.contrib.django.middleware.TracingMiddleware',
#...
)`;
