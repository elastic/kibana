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
} from './shared_hints';

export const phpVariables = {
  apmServiceName: 'elastic_apm.service_name',
  secretToken: 'elastic_apm.secret_token',
  apmServerUrl: 'elastic_apm.server_url',
  apmEnvironment: 'elastic_apm.environment',
};

export const phpHighlightLang = 'php';

export const phpLineNumbers = {
  start: 1,
  highlight: '1, 3, 5, 7',
  annotations: {
    1: serviceNameHint,
    3: secretTokenHint,
    5: serverUrlHint,
    7: serviceEnvironmentHint,
  },
};

export const php = `${phpVariables.apmServiceName}="{{{apmServiceName}}}"

${phpVariables.secretToken}="{{{secretToken}}}"

${phpVariables.apmServerUrl}="{{{apmServerUrl}}}"

${phpVariables.apmEnvironment}="{{{apmEnvironment}}}"`;
