/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const dotnetVariables = (apiKey?: string) => ({
  apmServiceName: 'ServiceName',
  ...(!apiKey && { secretToken: 'SecretToken' }),
  ...(apiKey && { apiKey: 'ApiKey' }),
  apmServerUrl: 'ServerUrl',
  apmEnvironment: 'Environment',
});

export const dotnetHighlightLang = 'dotnet';

export const dotnetLineNumbers = (apiKey?: string) => ({
  start: 1,
  highlight: '1-2, 4, 6, 8, 10-12',
});

export const dotnet = `{
  "ElasticApm": {
    /// {{serviceNameHint}} ${i18n.translate(
      'xpack.apm.tutorial.dotnetClient.createConfig.commands.defaultServiceName',
      {
        defaultMessage: 'Default is the entry assembly of the application.',
      }
    )}
    "ServiceName": "my-service-name",
    {{#apiKey}}
    /// {{apiKeyHint}}
    "ApiKey": "{{{apiKey}}}",
    {{/apiKey}}
    {{^apiKey}}
    /// {{secretTokenHint}}
    "SecretToken": "{{{secretToken}}}",
    {{/apiKey}}
    /// {{{serverUrlHint}}}
    "ServerUrl": "{{{apmServerUrl}}}",
    /// {{serviceEnvironmentHint}}
    "Environment": "my-environment",
  }
}`;
