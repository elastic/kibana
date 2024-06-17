/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NAME = i18n.translate('xpack.stackConnectors.casesWebhook.title', {
  defaultMessage: 'Webhook - Case Management',
});

export const INVALID_URL = (err: string, url: string) =>
  i18n.translate('xpack.stackConnectors.casesWebhook.configurationErrorNoHostname', {
    defaultMessage: 'error configuring cases webhook action: unable to parse {url}: {err}',
    values: {
      err: err.toString(),
      url,
    },
  });

export const CONFIG_ERR = (err: string) =>
  i18n.translate('xpack.stackConnectors.casesWebhook.configurationError', {
    defaultMessage: 'error configuring cases webhook action: {err}',
    values: {
      err: err.toString(),
    },
  });

export const INVALID_USER_PW = i18n.translate(
  'xpack.stackConnectors.casesWebhook.invalidUsernamePassword',
  {
    defaultMessage: 'both user and password must be specified',
  }
);

export const ALLOWED_HOSTS_ERROR = (message: string) =>
  i18n.translate('xpack.stackConnectors.casesWebhook.configuration.apiAllowedHostsError', {
    defaultMessage: 'error configuring connector action: {message}',
    values: {
      message,
    },
  });
