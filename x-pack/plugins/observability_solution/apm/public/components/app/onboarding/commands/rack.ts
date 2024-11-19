/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const rackVariables = (secretToken?: string) => ({
  ...(secretToken && { secretToken: 'secret_token' }),
  ...(!secretToken && { apiKey: 'api_key' }),
  apmServerUrl: 'server_url',
});

export const rackHighlightLang = 'rb';

export const rackLineNumbers = () => ({
  start: 1,
  highlight: '4, 7, 10, 13',
});

export const rack = `# config/elastic_apm.yml:

# {{serviceNameHint}} ${i18n.translate(
  'xpack.apm.onboarding.rackClient.createConfig.commands.defaultsToTheNameOfRackAppClassComment',
  {
    defaultMessage: "Defaults to the name of your Rack app's class.",
  }
)}
service_name: '<your-service-name>'

{{^secretToken}}
# {{apiKeyHint}}
api_key: '{{{apiKey}}}'
{{/secretToken}}
{{#secretToken}}
# {{secretTokenHint}}
secret_token: '{{{secretToken}}}'
{{/secretToken}}

# {{{serverUrlHint}}}
server_url: '{{{apmServerUrl}}}'

# {{{serviceEnvironmentHint}}}
environment: '<your-environment>'`;
