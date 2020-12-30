/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const NAME = i18n.translate('xpack.actions.builtin.case.resilientTitle', {
  defaultMessage: 'IBM Resilient',
});

export const ALLOWED_HOSTS_ERROR = (message: string) =>
  i18n.translate('xpack.actions.builtin.configuration.apiAllowedHostsError', {
    defaultMessage: 'error configuring connector action: {message}',
    values: {
      message,
    },
  });
