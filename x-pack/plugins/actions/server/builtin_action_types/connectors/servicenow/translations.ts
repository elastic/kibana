/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const NAME = i18n.translate('xpack.actions.builtin.servicenowTitle', {
  defaultMessage: 'ServiceNow',
});

export const MAPPING_EMPTY = i18n.translate('xpack.actions.builtin.servicenow.emptyMapping', {
  defaultMessage: '[casesConfiguration.mapping]: expected non-empty but got empty',
});

export const WHITE_LISTED_ERROR = (message: string) =>
  i18n.translate('xpack.actions.builtin.servicenow.servicenowApiWhitelistError', {
    defaultMessage: 'error configuring servicenow action: {message}',
    values: {
      message,
    },
  });
