/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SERVICENOW = i18n.translate('xpack.actions.builtin.serviceNowTitle', {
  defaultMessage: 'ServiceNow',
});

export const SERVICENOW_ITSM = i18n.translate('xpack.actions.builtin.serviceNowITSMTitle', {
  defaultMessage: 'ServiceNow ITSM',
});

export const SERVICENOW_SIR = i18n.translate('xpack.actions.builtin.serviceNowSIRTitle', {
  defaultMessage: 'ServiceNow SecOps',
});

export const SERVICENOW_ITOM = i18n.translate('xpack.actions.builtin.serviceNowITOMTitle', {
  defaultMessage: 'ServiceNow ITOM',
});

export const ALLOWED_HOSTS_ERROR = (message: string) =>
  i18n.translate('xpack.actions.builtin.configuration.apiAllowedHostsError', {
    defaultMessage: 'error configuring connector action: {message}',
    values: {
      message,
    },
  });
