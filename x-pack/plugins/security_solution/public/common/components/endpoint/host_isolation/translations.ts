/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CANCEL = i18n.translate('xpack.securitySolution.endpoint.hostIsolation.cancel', {
  defaultMessage: 'Cancel',
});

export const CONFIRM = i18n.translate('xpack.securitySolution.endpoint.hostIsolation.confirm', {
  defaultMessage: 'Confirm',
});

export const COMMENT = i18n.translate('xpack.securitySolution.endpoint.hostIsolation.comment', {
  defaultMessage: 'Comment',
});

export const COMMENT_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.endpoint.hostIsolation.comment.placeholder',
  { defaultMessage: 'You may leave an optional note here.' }
);

export const GET_ISOLATION_SUCCESS_MESSAGE = (hostName: string) =>
  i18n.translate('xpack.securitySolution.endpoint.hostIsolation.isolation.successfulMessage', {
    defaultMessage: 'Isolation on host {hostName} successfully submitted',
    values: { hostName },
  });

export const GET_UNISOLATION_SUCCESS_MESSAGE = (hostName: string) =>
  i18n.translate('xpack.securitySolution.endpoint.hostIsolation.unisolate.successfulMessage', {
    defaultMessage: 'Release on host {hostName} successfully submitted',
    values: { hostName },
  });

export const UNISOLATE = i18n.translate('xpack.securitySolution.endpoint.hostisolation.unisolate', {
  defaultMessage: 'release',
});

export const ISOLATED = i18n.translate('xpack.securitySolution.endpoint.hostIsolation.isolated', {
  defaultMessage: 'isolated',
});
