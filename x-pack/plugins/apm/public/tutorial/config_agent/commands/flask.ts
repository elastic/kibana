/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const flaskVariables = {
  apmServiceName: 'SERVICE_NAME',
  secretToken: 'SECRET_TOKEN',
  apmServerUrl: 'SERVER_URL',
  apmEnvironment: 'ENVIRONMENT',
};

export const flask = `# ${i18n.translate(
  'xpack.apm.tutorial.flaskClient.configure.commands.initializeUsingEnvironmentVariablesComment',
  {
    defaultMessage: 'initialize using environment variables',
  }
)}
from elasticapm.contrib.flask import ElasticAPM
app = Flask(__name__)
apm = ElasticAPM(app)

# ${i18n.translate(
  'xpack.apm.tutorial.flaskClient.configure.commands.configureElasticApmComment',
  {
    defaultMessage:
      "or configure to use ELASTIC_APM in your application's settings",
  }
)}
from elasticapm.contrib.flask import ElasticAPM
app.config['ELASTIC_APM'] = {
  # ${i18n.translate(
    'xpack.apm.tutorial.flaskClient.configure.commands.setRequiredServiceNameComment',
    {
      defaultMessage: 'Set the required service name. Allowed characters:',
    }
  )}
  # ${i18n.translate(
    'xpack.apm.tutorial.flaskClient.configure.commands.allowedCharactersComment',
    {
      defaultMessage: 'a-z, A-Z, 0-9, -, _, and space',
    }
  )}
  #'${flaskVariables.apmServiceName}': '{{{apmServiceName}}}',

  # ${i18n.translate(
    'xpack.apm.tutorial.flaskClient.configure.commands.useIfApmServerRequiresTokenComment',
    {
      defaultMessage: 'Use if APM Server requires a secret token',
    }
  )}
  '${flaskVariables.secretToken}': '{{{secretToken}}}',

  # ${i18n.translate(
    'xpack.apm.tutorial.flaskClient.configure.commands.setCustomApmServerUrlComment',
    {
      defaultMessage:
        'Set the custom APM Server URL (default: {defaultApmServerUrl})',
      values: { defaultApmServerUrl: 'http://localhost:8200' },
    }
  )}
  '${flaskVariables.apmServerUrl}': '{{{apmServerUrl}}}',

  # ${i18n.translate(
    'xpack.apm.tutorial.flaskClient.configure.commands.setServiceEnvironmentComment',
    {
      defaultMessage: 'Set the service environment',
    }
  )}
  '${flaskVariables.apmEnvironment}': '{{{apmEnvironment}}}',
}

apm = ElasticAPM(app)`;
