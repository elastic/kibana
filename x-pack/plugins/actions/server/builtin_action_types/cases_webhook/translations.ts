/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NAME = i18n.translate('xpack.actions.builtin.cases.casesWebhookTitle', {
  defaultMessage: 'Webhook - Incident Management',
});

export const INVALID_URL = (err: string, url: string) =>
  i18n.translate('xpack.actions.builtin.casesWebhook.casesWebhookConfigurationErrorNoHostname', {
    defaultMessage: 'error configuring cases webhook action: unable to parse {url}: {err}',
    values: {
      err,
      url,
    },
  });

export const CONFIG_ERR = (err: string) =>
  i18n.translate('xpack.actions.builtin.casesWebhook.casesWebhookConfigurationError', {
    defaultMessage: 'error configuring cases webhook action: {err}',
    values: {
      err,
    },
  });

export const INVALID_USER_PW = i18n.translate(
  'xpack.actions.builtin.casesWebhook.invalidUsernamePassword',
  {
    defaultMessage: 'both user and password must be specified',
  }
);
