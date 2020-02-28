/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const API_URL_REQUIRED = i18n.translate(
  'xpack.actions.builtin.servicenow.servicenowApiNullError',
  {
    defaultMessage: 'ServiceNow [apiUrl] is required',
  }
);

export const WHITE_LISTED_ERROR = (message: string) =>
  i18n.translate('xpack.actions.builtin.servicenow.servicenowApiWhitelistError', {
    defaultMessage: 'error configuring servicenow action: {message}',
    values: {
      message,
    },
  });

export const NO_USERNAME = i18n.translate(
  'xpack.actions.builtin.servicenow.servicenowApiUserError',
  {
    defaultMessage: 'error configuring servicenow action: no secrets [username] provided',
  }
);

export const NO_PASSWORD = i18n.translate(
  'xpack.actions.builtin.servicenow.servicenowApiPasswordError',
  {
    defaultMessage: 'error configuring servicenow action: no secrets [password] provided',
  }
);

export const NAME = i18n.translate('xpack.actions.builtin.servicenowTitle', {
  defaultMessage: 'ServiceNow',
});

export const ERROR_POSTING = i18n.translate(
  'xpack.actions.builtin.servicenow.postingErrorMessage',
  {
    defaultMessage: 'error posting servicenow event',
  }
);

export const RETRY_POSTING = (status: number) =>
  i18n.translate('xpack.actions.builtin.servicenow.postingRetryErrorMessage', {
    defaultMessage: 'error posting servicenow event: http status {status}, retry later',
    values: {
      status,
    },
  });

export const UNEXPECTED_STATUS = (status: number) =>
  i18n.translate('xpack.actions.builtin.servicenow.postingUnexpectedErrorMessage', {
    defaultMessage: 'error posting servicenow event: unexpected status {status}',
    values: {
      status,
    },
  });
