/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const rack = `# config/elastic_apm.yml:

# ${i18n.translate(
  'xpack.apm.tutorial.rackClient.createConfig.commands.setServiceNameComment',
  {
    defaultMessage:
      'Set the service name - allowed characters: a-z, A-Z, 0-9, -, _ and space',
  }
)}
# ${i18n.translate(
  'xpack.apm.tutorial.rackClient.createConfig.commands.defaultsToTheNameOfRackAppClassComment',
  {
    defaultMessage: "Defaults to the name of your Rack app's class.",
  }
)}
service_name: 'my-service'

# ${i18n.translate(
  'xpack.apm.tutorial.rackClient.createConfig.commands.useIfApmServerRequiresTokenComment',
  {
    defaultMessage: 'Use if APM Server requires a token',
  }
)}
secret_token: '{{{secretToken}}}'

# ${i18n.translate(
  'xpack.apm.tutorial.rackClient.createConfig.commands.setCustomApmServerComment',
  {
    defaultMessage: 'Set custom APM Server URL (default: {defaultServerUrl})',
    values: { defaultServerUrl: 'http://localhost:8200' },
  }
)}
server_url: '{{{apmServerUrl}}}',

# ${i18n.translate(
  'xpack.apm.tutorial.rackClient.createConfig.commands.setServiceEnvironment',
  {
    defaultMessage: 'Set the service environment',
  }
)}
environment: 'production'`;
