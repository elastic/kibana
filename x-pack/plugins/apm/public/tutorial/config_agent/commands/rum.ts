/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const rum = `import { init as initApm } from '@elastic/apm-rum'
var apm = initApm({

  // ${i18n.translate(
    'xpack.apm.tutorial.jsClient.installDependency.commands.setRequiredServiceNameComment',
    {
      defaultMessage:
        'Set required service name (allowed characters: a-z, A-Z, 0-9, -, _, and space)',
    }
  )}
  serviceName: 'your-app-name',

  // ${i18n.translate(
    'xpack.apm.tutorial.jsClient.installDependency.commands.setCustomApmServerUrlComment',
    {
      defaultMessage:
        'Set custom APM Server URL (default: {defaultApmServerUrl})',
      values: { defaultApmServerUrl: 'http://localhost:8200' },
    }
  )}
  serverUrl: '{{{apmServerUrl}}}',

  // ${i18n.translate(
    'xpack.apm.tutorial.jsClient.installDependency.commands.setServiceVersionComment',
    {
      defaultMessage:
        'Set the service version (required for source map feature)',
    }
  )}
  serviceVersion: '',

  // ${i18n.translate(
    'xpack.apm.tutorial.jsClient.installDependency.commands.setServiceEnvironmentComment',
    {
      defaultMessage: 'Set the service environment',
    }
  )}
  environment: 'production'
})`;

export const rumScript = `\
<script src="https://your-cdn-host.com/path/to/elastic-apm-rum.umd.min.js" crossorigin></script>
<script>
  elasticApm.init({
    serviceName: 'your-app-name',
    serverUrl: '{{{apmServerUrl}}}',
  })
</script>
`;
