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
} from './shared_hints';

export const railsVariables = {
  apmServiceName: 'service_name',
  secretToken: 'secret_token',
  apmServerUrl: 'server_url',
  apmEnvironment: 'environment',
};

export const railsHighlightLang = 'rb';

const railsServiceNameHint = i18n.translate(
  'xpack.apm.tutorial.railsClient.createConfig.commands.defaultServiceName',
  {
    defaultMessage: 'Defaults to the name of your Rails app.',
  }
);

export const railsLineNumbers = {
  start: 1,
  highlight: '3, 5, 7, 9',
  annotations: {
    3: `${serviceNameHint} ${railsServiceNameHint}`,
    5: secretTokenHint,
    7: serverUrlHint,
    9: serviceEnvironmentHint,
  },
};

export const rails = `# config/elastic_apm.yml:

${railsVariables.apmServiceName}: '{{{apmServiceName}}}'

${railsVariables.secretToken}: '{{{secretToken}}}'

${railsVariables.apmServerUrl}: '{{{apmServerUrl}}}'

${railsVariables.apmEnvironment}: '{{{apmEnvironment}}}'`;
