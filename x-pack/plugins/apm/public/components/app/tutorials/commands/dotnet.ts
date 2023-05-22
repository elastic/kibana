/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  serviceNameHint,
  secretTokenHint,
  serverUrlHint,
  serviceEnvironmentHint,
  apiKeyHint,
} from './shared_hints';

export const dotnetVariables = {
  apmServiceName: 'ServiceName',
  secretToken: 'SecretToken',
  apiKey: 'ApiKey',
  apmServerUrl: 'ServerUrl',
  apmEnvironment: 'Environment',
};

export const dotnetHighlightLang = 'dotnet';

const dotnetServiceNameHint = i18n.translate(
  'xpack.apm.tutorial.dotnetClient.createConfig.commands.defaultServiceName',
  {
    defaultMessage: 'Default is the entry assembly of the application.',
  }
);

export const dotnetLineNumbers = (apiKey?: string) => ({
  start: 1,
  highlight: '3, 4, 5, 6',
  annotations: {
    3: `${serviceNameHint} ${dotnetServiceNameHint}`,
    4: apiKey ? apiKeyHint : secretTokenHint,
    5: serverUrlHint,
    6: serviceEnvironmentHint,
  },
});

export const dotnet = `{
  "ElasticApm": {
    "${dotnetVariables.apmServiceName}": "{{{apmServiceName}}}",
    {{#apiKey}}
    "${dotnetVariables.apiKey}": "{{{apiKey}}}",
    {{/apiKey}}
    {{^apiKey}}
    "${dotnetVariables.secretToken}": "{{{secretToken}}}",
    {{/apiKey}}
    "${dotnetVariables.apmServerUrl}": "{{{apmServerUrl}}}",
    "${dotnetVariables.apmEnvironment}": "{{{apmEnvironment}}}",
  }
}`;
