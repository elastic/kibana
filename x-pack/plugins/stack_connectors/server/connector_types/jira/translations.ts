/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MAX_CUSTOM_FIELDS_LENGTH } from './constants';

export const NAME = i18n.translate('xpack.stackConnectors.jira.title', {
  defaultMessage: 'Jira',
});

export const ALLOWED_HOSTS_ERROR = (message: string) =>
  i18n.translate('xpack.stackConnectors.jira.configuration.apiAllowedHostsError', {
    defaultMessage: 'error configuring connector action: {message}',
    values: {
      message,
    },
  });

export const CUSTOM_FIELDS_LENGTH_ERROR = i18n.translate(
  'xpack.stackConnectors.jira.schema.customFieldsLengthError',
  {
    defaultMessage: `A maximum of ${MAX_CUSTOM_FIELDS_LENGTH} customFields can be updated at a time.`,
  }
);
