/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SLACK_CONNECTOR_NAME = i18n.translate('xpack.stackConnectors.slack.v2.title', {
  defaultMessage: 'Slack',
});

export const ALLOWED_HOSTS_ERROR = (message: string) =>
  i18n.translate('xpack.stackConnectors.slack.v2.configuration.apiAllowedHostsError', {
    defaultMessage: 'error configuring connector action: {message}',
    values: {
      message,
    },
  });
