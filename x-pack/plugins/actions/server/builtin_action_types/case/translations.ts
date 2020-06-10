/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const API_URL_REQUIRED = i18n.translate('xpack.actions.builtin.case.connectorApiNullError', {
  defaultMessage: 'connector [apiUrl] is required',
});

export const FIELD_INFORMATION = (
  mode: string,
  date: string | undefined,
  user: string | undefined
) => {
  switch (mode) {
    case 'create':
      return i18n.translate('xpack.actions.builtin.case.common.externalIncidentCreated', {
        values: { date, user },
        defaultMessage: '(created at {date} by {user})',
      });
    case 'update':
      return i18n.translate('xpack.actions.builtin.case.common.externalIncidentUpdated', {
        values: { date, user },
        defaultMessage: '(updated at {date} by {user})',
      });
    case 'add':
      return i18n.translate('xpack.actions.builtin.case.common.externalIncidentAdded', {
        values: { date, user },
        defaultMessage: '(added at {date} by {user})',
      });
    default:
      return i18n.translate('xpack.actions.builtin.case.common.externalIncidentDefault', {
        values: { date, user },
        defaultMessage: '(created at {date} by {user})',
      });
  }
};

export const MAPPING_EMPTY = i18n.translate(
  'xpack.actions.builtin.case.configuration.emptyMapping',
  {
    defaultMessage: '[casesConfiguration.mapping]: expected non-empty but got empty',
  }
);

export const WHITE_LISTED_ERROR = (message: string) =>
  i18n.translate('xpack.actions.builtin.case.configuration.apiWhitelistError', {
    defaultMessage: 'error configuring connector action: {message}',
    values: {
      message,
    },
  });
