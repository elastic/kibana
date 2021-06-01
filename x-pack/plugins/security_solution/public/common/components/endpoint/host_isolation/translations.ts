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
    defaultMessage: 'Host Isolation on {hostName} successfully submitted',
    values: { hostName },
  });

export const GET_UNISOLATION_SUCCESS_MESSAGE = (hostName: string) =>
  i18n.translate('xpack.securitySolution.endpoint.hostIsolation.unisolate.successfulMessage', {
    defaultMessage: 'Host Unisolation on {hostName} successfully submitted',
    values: { hostName },
  });

export const ISOLATE = i18n.translate('xpack.securitySolution.endpoint.hostisolation.isolate', {
  defaultMessage: 'isolate',
});

export const UNISOLATE = i18n.translate('xpack.securitySolution.endpoint.hostisolation.unisolate', {
  defaultMessage: 'unisolate',
});

export const NOT_ISOLATED = i18n.translate(
  'xpack.securitySolution.endpoint.hostIsolation.notIsolated',
  {
    defaultMessage: 'not isolated',
  }
);

export const ISOLATED = i18n.translate('xpack.securitySolution.endpoint.hostIsolation.isolated', {
  defaultMessage: 'isolated',
});
