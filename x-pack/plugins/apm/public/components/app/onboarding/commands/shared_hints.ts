/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const serviceNameHint = i18n.translate(
  'xpack.apm.onboarding.shared_clients.configure.commands.serviceNameHint',
  {
    defaultMessage:
      'The service name is the primary filter in the APM UI and is used to group errors and trace data together. Allowed characters are a-z, A-Z, 0-9, -, _, and space.',
  }
);

export const secretTokenHint = i18n.translate(
  'xpack.apm.onboarding.shared_clients.configure.commands.secretTokenHint',
  {
    defaultMessage:
      'Use if APM Server requires a secret token. Both the agent and APM Server must be configured with the same token. This ensures that only your agents can send data to your APM server.',
  }
);

export const apiKeyHint = i18n.translate(
  'xpack.apm.onboarding.shared_clients.configure.commands.apiKeyHint',
  {
    defaultMessage:
      'Use if APM Server requires an API Key. This is used to ensure that only your agents can send data to your APM server. Agents can use API keys as a replacement of secret token, APM server can have multiple API keys. When both secret token and API key are used, API key has priority and secret token is ignored.',
  }
);
export const serverUrlHint = i18n.translate(
  'xpack.apm.onboarding.shared_clients.configure.commands.serverUrlHint',
  {
    defaultMessage:
      'Set the custom APM Server URL (default: {defaultApmServerUrl}). The URL must be fully qualified, including protocol (http or https) and port.',
    values: { defaultApmServerUrl: 'http://localhost:8200' },
  }
);

export const serviceEnvironmentHint = i18n.translate(
  'xpack.apm.onboarding.shared_clients.configure.commands.serviceEnvironmentHint',
  {
    defaultMessage: `The name of the environment this service is deployed in, e.g., "production" or "staging". Environments allow you to easily filter data on a global level in the APM UI. It's important to be consistent when naming environments across agents.`,
  }
);
