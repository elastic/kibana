/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  serviceNameHint,
  serverUrlHint,
  serviceEnvironmentHint,
} from './shared_hints';

export const rumVariables = {
  apmServiceName: 'serviceName',
  apmServerUrl: 'serverUrl',
  apmServiceVersion: 'serviceVersion',
  apmEnvironment: 'environment',
};

export const rumHighlightLang = 'js';

const rumServiceVersionHint = i18n.translate(
  'xpack.apm.tutorial.jsClient.installDependency.commands.setServiceVersionComment',
  {
    defaultMessage: 'Set the service version (required for source map feature)',
  }
);

export const rumLineNumbers = {
  start: 1,
  highlight: '3, 5, 7, 9',
  annotations: {
    3: serviceNameHint,
    5: serverUrlHint,
    7: rumServiceVersionHint,
    9: serviceEnvironmentHint,
  },
};

export const rum = `import { init as initApm } from '@elastic/apm-rum'
var apm = initApm({
  ${rumVariables.apmServiceName}: '{{{apmServiceName}}}',

  ${rumVariables.apmServerUrl}: '{{{apmServerUrl}}}',

  serviceVersion: '',

  ${rumVariables.apmEnvironment}: '{{{apmEnvironment}}}'
})`;

export const rumScript = `\
<script src="https://your-cdn-host.com/path/to/elastic-apm-rum.umd.min.js" crossorigin></script>
<script>
  elasticApm.init({
    ${rumVariables.apmServiceName}: '{{{apmServiceName}}}',
    ${rumVariables.apmServerUrl}: '{{{apmServerUrl}}}',
  })
</script>
`;
