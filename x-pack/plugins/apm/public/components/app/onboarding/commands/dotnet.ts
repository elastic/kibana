/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const dotnetVariables = (secretToken?: string) => ({
  ...(secretToken && { secretToken: 'SecretToken' }),
  ...(!secretToken && { apiKey: 'ApiKey' }),
  apmServerUrl: 'ServerUrl',
});

export const dotnetHighlightLang = 'dotnet';

export const dotnetLineNumbers = () => ({
  start: 1,
  highlight: '1-2, 4, 6-8',
});

export const dotnet = `{
  "ElasticApm": {
    {{^secretToken}}
    /// {{apiKeyHint}}
    "ApiKey": "{{{apiKey}}}",
    {{/secretToken}}
    {{#secretToken}}
    /// {{secretTokenHint}}
    "SecretToken": "{{{secretToken}}}",
    {{/secretToken}}
    /// {{{serverUrlHint}}}
    "ServerUrl": "{{{apmServerUrl}}}",
  }
}`;
