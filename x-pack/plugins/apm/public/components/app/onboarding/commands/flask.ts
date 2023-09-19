/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const flaskVariables = (secretToken?: string) => ({
  ...(secretToken && { secretToken: 'SECRET_TOKEN' }),
  ...(!secretToken && { apiKey: 'API_KEY' }),
  apmServerUrl: 'SERVER_URL',
});

export const flaskHighlightLang = 'py';

export const flaskLineNumbers = () => ({
  start: 1,
  highlight: '2-4, 7-8, 10, 12, 15, 18-21',
});

export const flask = `# ${i18n.translate(
  'xpack.apm.onboarding.flaskClient.configure.commands.initializeUsingEnvironmentVariablesComment',
  {
    defaultMessage: 'Initialize using environment variables',
  }
)}
from elasticapm.contrib.flask import ElasticAPM
app = Flask(__name__)
apm = ElasticAPM(app)

# ${i18n.translate(
  'xpack.apm.onboarding.flaskClient.configure.commands.configureElasticApmComment',
  {
    defaultMessage: "Or use ELASTIC_APM in your application's settings",
  }
)}
from elasticapm.contrib.flask import ElasticAPM
app.config['ELASTIC_APM'] = {
  # {{serviceNameHint}}
  'SERVICE_NAME': '<your-service-name>',
  {{^secretToken}}
  # {{apiKeyHint}}
  'API_KEY': '{{{apiKey}}}',
  {{/secretToken}}
  {{#secretToken}}
  # {{secretTokenHint}}
  'SECRET_TOKEN': '{{{secretToken}}}',
  {{/secretToken}}

  # {{{serverUrlHint}}}
  'SERVER_URL': '{{{apmServerUrl}}}',

  # {{{serviceEnvironmentHint}}}
  'ENVIRONMENT': '<your-environment>',
}

apm = ElasticAPM(app)`;
