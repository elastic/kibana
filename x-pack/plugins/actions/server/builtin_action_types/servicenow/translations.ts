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

export const NAME = i18n.translate('xpack.actions.builtin.servicenowTitle', {
  defaultMessage: 'ServiceNow',
});

export const MAPPING_EMPTY = i18n.translate('xpack.actions.builtin.servicenow.emptyMapping', {
  defaultMessage: '[casesConfiguration.mapping]: expected non-empty but got empty',
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

export const FIELD_INFORMATION = (
  mode: string,
  date: string | undefined,
  user: string | undefined
) => {
  switch (mode) {
    case 'create':
      return i18n.translate('xpack.actions.builtin.servicenow.informationCreated', {
        values: { date, user },
        defaultMessage: '(created at {date} by {user})',
      });
    case 'update':
      return i18n.translate('xpack.actions.builtin.servicenow.informationUpdated', {
        values: { date, user },
        defaultMessage: '(updated at {date} by {user})',
      });
    case 'add':
      return i18n.translate('xpack.actions.builtin.servicenow.informationAdded', {
        values: { date, user },
        defaultMessage: '(added at {date} by {user})',
      });
    default:
      return i18n.translate('xpack.actions.builtin.servicenow.informationDefault', {
        values: { date, user },
        defaultMessage: '(created at {date} by {user})',
      });
  }
};
