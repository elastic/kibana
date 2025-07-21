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

export const flaskVariables = {
  apmServiceName: 'SERVICE_NAME',
  secretToken: 'SECRET_TOKEN',
  apmServerUrl: 'SERVER_URL',
  apmEnvironment: 'ENVIRONMENT',
};

export const flaskHighlightLang = 'py';

export const flaskLineNumbers = {
  start: 1,
  highlight: '2-4, 7-18',
  annotations: {
    9: serviceNameHint,
    11: secretTokenHint,
    13: serverUrlHint,
    15: serviceEnvironmentHint,
  },
};

export const flask = `# ${i18n.translate(
  'xpack.apm.tutorial.flaskClient.configure.commands.initializeUsingEnvironmentVariablesComment',
  {
    defaultMessage: 'Initialize using environment variables',
  }
)}
from elasticapm.contrib.flask import ElasticAPM
app = Flask(__name__)
apm = ElasticAPM(app)

# ${i18n.translate('xpack.apm.tutorial.flaskClient.configure.commands.configureElasticApmComment', {
  defaultMessage: "Or use ELASTIC_APM in your application's settings",
})}
from elasticapm.contrib.flask import ElasticAPM
app.config['ELASTIC_APM'] = {
  '${flaskVariables.apmServiceName}': '{{{apmServiceName}}}',

  '${flaskVariables.secretToken}': '{{{secretToken}}}',

  '${flaskVariables.apmServerUrl}': '{{{apmServerUrl}}}',

  '${flaskVariables.apmEnvironment}': '{{{apmEnvironment}}}',
}

apm = ElasticAPM(app)`;
