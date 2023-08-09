/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const goVariables = (secretToken?: string) => ({
  ...(secretToken && { secretToken: 'ELASTIC_APM_SECRET_TOKEN' }),
  ...(!secretToken && { apiKey: 'ELASTIC_APM_API_KEY' }),
  apmServerUrl: 'ELASTIC_APM_SERVER_URL',
});

export const goHighlightLang = 'go';

export const goLineNumbers = () => ({
  start: 1,
  highlight: '4, 7, 10, 13',
});

export const go = `# ${i18n.translate(
  'xpack.apm.onboarding.goClient.configure.commands.initializeUsingEnvironmentVariablesComment',
  {
    defaultMessage: 'Initialize using environment variables:',
  }
)}

# {{serviceNameHint}} ${i18n.translate(
  'xpack.apm.onboarding.goClient.configure.commands.usedExecutableNameComment',
  {
    defaultMessage: 'If not specified, the executable name will be used.',
  }
)}
export ELASTIC_APM_SERVICE_NAME=<your-service-name>

{{^secretToken}}
# {{apiKeyHint}}
export ELASTIC_APM_API_KEY={{{apiKey}}}
{{/secretToken}}
{{#secretToken}}
# {{secretTokenHint}}
export ELASTIC_APM_SECRET_TOKEN={{{secretToken}}}
{{/secretToken}}

# {{{serverUrlHint}}}
export ELASTIC_APM_SERVER_URL={{{apmServerUrl}}}

# {{{serviceEnvironmentHint}}}
export ELASTIC_APM_ENVIRONMENT=<your-environment>
`;
