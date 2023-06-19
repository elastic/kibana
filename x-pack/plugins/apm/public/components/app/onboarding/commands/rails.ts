/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const railsVariables = (secretToken?: string) => ({
  ...(secretToken && { secretToken: 'secret_token' }),
  ...(!secretToken && { apiKey: 'api_key' }),
  apmServerUrl: 'server_url',
});

export const railsHighlightLang = 'rb';

export const railsLineNumbers = () => ({
  start: 1,
  highlight: '3, 6',
});

export const rails = `# config/elastic_apm.yml:
{{^secretToken}}
# {{apiKeyHint}}
api_key: '{{{apiKey}}}'
{{/secretToken}}
{{#secretToken}}
# {{secretTokenHint}}
secret_token: '{{{secretToken}}}'
{{/secretToken}}

# {{{serverUrlHint}}}
server_url: '{{{apmServerUrl}}}'`;
