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

export const rackVariables = {
  apmServiceName: 'service_name',
  secretToken: 'secret_token',
  apiKey: 'api_key',
  apmServerUrl: 'server_url',
  apmEnvironment: 'environment',
};

export const rackHighlightLang = 'rb';

const rackServiceNameHint = i18n.translate(
  'xpack.apm.tutorial.rackClient.createConfig.commands.defaultsToTheNameOfRackAppClassComment',
  {
    defaultMessage: "Defaults to the name of your Rack app's class.",
  }
);

export const rackLineNumbers = (apiKey?: string) => ({
  start: 1,
  highlight: '3, 5, 7, 9',
  annotations: {
    3: `${serviceNameHint} ${rackServiceNameHint}`,
    5: apiKey ? apiKeyHint : secretTokenHint,
    7: serverUrlHint,
    9: serviceEnvironmentHint,
  },
});

export const rack = `# config/elastic_apm.yml:

${rackVariables.apmServiceName}: '{{{apmServiceName}}}'

{{#apiKey}}
${rackVariables.apiKey}: '{{{apiKey}}}'
{{/apiKey}}
{{^apiKey}}
${rackVariables.secretToken}: '{{{secretToken}}}'
{{/apiKey}}

${rackVariables.apmServerUrl}: '{{{apmServerUrl}}}'

${rackVariables.apmEnvironment}: '{{{apmEnvironment}}}'`;
