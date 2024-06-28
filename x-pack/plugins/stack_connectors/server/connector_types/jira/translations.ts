/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

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

export const OTHER_FIELDS_LENGTH_ERROR = (length: number) =>
  i18n.translate('xpack.stackConnectors.jira.schema.otherFieldsLengthError', {
    values: { length },
    defaultMessage: 'A maximum of {length} otherFields can be defined at a time.',
  });

export const OTHER_FIELDS_PROPERTY_ERROR = (properties: string) =>
  i18n.translate('xpack.stackConnectors.jira.schema.otherFieldsPropertyError', {
    values: { properties },
    defaultMessage: 'The following properties cannot be defined inside otherFields: {properties}.',
  });
