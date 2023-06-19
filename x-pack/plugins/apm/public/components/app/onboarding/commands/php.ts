/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const phpVariables = (secretToken?: string) => ({
  ...(secretToken && { secretToken: 'elastic_apm.secret_token' }),
  ...(!secretToken && { apiKey: 'elastic_apm.api_key' }),
  apmServerUrl: 'elastic_apm.server_url',
});

export const phpHighlightLang = 'php';

export const phpLineNumbers = () => ({
  start: 1,
  highlight: '3, 6',
});

export const php = `
{{^secretToken}}
# {{apiKeyHint}}
elastic_apm.api_key="{{{apiKey}}}"
{{/secretToken}}
{{#secretToken}}
# {{secretTokenHint}}
elastic_apm.secret_token="{{{secretToken}}}"
{{/secretToken}}

# {{serverUrlHint}}
elastic_apm.server_url="{{{apmServerUrl}}}"`;
