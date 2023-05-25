/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const rackVariables = (apiKey?: string) => ({
  apmServiceName: 'service_name',
  ...(!apiKey && { secretToken: 'secret_token' }),
  ...(apiKey && { apiKey: 'api_key' }),
  apmServerUrl: 'server_url',
  apmEnvironment: 'environment',
});

export const rackHighlightLang = 'rb';

export const rackLineNumbers = (apiKey?: string) => ({
  start: 1,
  highlight: '4, 7, 10, 13',
});

export const rack = `# config/elastic_apm.yml:

# {{serviceNameHint}} ${i18n.translate(
  'xpack.apm.tutorial.rackClient.createConfig.commands.defaultsToTheNameOfRackAppClassComment',
  {
    defaultMessage: "Defaults to the name of your Rack app's class.",
  }
)}
service_name: 'my-service-name'

{{#apiKey}}
# {{apiKeyHint}}
api_key: '{{{apiKey}}}'
{{/apiKey}}
{{^apiKey}}
# {{secretTokenHint}}
secret_token: '{{{secretToken}}}'
{{/apiKey}}

# {{{serverUrlHint}}}
server_url: '{{{apmServerUrl}}}'

# {{serviceEnvironmentHint}}
environment: 'my-environment'`;
