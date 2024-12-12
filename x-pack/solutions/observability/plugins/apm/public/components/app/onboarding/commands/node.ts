/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const nodeVariables = (secretToken?: string) => ({
  ...(secretToken && { secretToken: 'secretToken' }),
  ...(!secretToken && { apiKey: 'apiKey' }),
  apmServerUrl: 'serverUrl',
});

export const nodeHighlightLang = 'js';

export const nodeLineNumbers = () => ({
  start: 1,
  highlight: '2, 4, 7, 10, 13-14',
});

export const node = `// ${i18n.translate(
  'xpack.apm.onboarding.nodeClient.configure.commands.addThisToTheFileTopComment',
  {
    defaultMessage: 'Add this to the very top of the first file loaded in your app',
  }
)}
var apm = require('elastic-apm-node').start({
  // {{serviceNameHint}} ${i18n.translate(
    'xpack.apm.onboarding.nodeClient.createConfig.commands.serviceName',
    {
      defaultMessage: 'Overrides the service name in package.json.',
    }
  )}
  serviceName: '<your-service-name>',

  {{^secretToken}}
  // {{apiKeyHint}}
  apiKey: '{{{apiKey}}}',
  {{/secretToken}}
  {{#secretToken}}
  // {{secretTokenHint}}
  secretToken: '{{{secretToken}}}',
  {{/secretToken}}

  // {{{serverUrlHint}}}
  serverUrl: '{{{apmServerUrl}}}',

  // {{{serviceEnvironmentHint}}}
  environment: '<your-environment>'
})`;
