/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  serviceNameHint,
  secretTokenHint,
  serverUrlHint,
  serviceEnvironmentHint,
  apiKeyHint,
} from './shared_hints';

export const phpVariables = {
  apmServiceName: 'elastic_apm.service_name',
  secretToken: 'elastic_apm.secret_token',
  apiKey: 'elastic_apm.api_key',
  apmServerUrl: 'elastic_apm.server_url',
  apmEnvironment: 'elastic_apm.environment',
};

export const phpHighlightLang = 'php';

export const phpLineNumbers = (apiKey?: string) => ({
  start: 1,
  highlight: '1, 3, 5, 7',
  annotations: {
    1: serviceNameHint,
    3: apiKey ? apiKeyHint : secretTokenHint,
    5: serverUrlHint,
    7: serviceEnvironmentHint,
  },
});

export const php = `${phpVariables.apmServiceName}="{{{apmServiceName}}}"

{{#apiKey}}
${phpVariables.apiKey}="{{{apiKey}}}"
{{/apiKey}}
{{^apiKey}}
${phpVariables.secretToken}="{{{secretToken}}}"
{{/apiKey}}

${phpVariables.apmServerUrl}="{{{apmServerUrl}}}"

${phpVariables.apmEnvironment}="{{{apmEnvironment}}}"`;
