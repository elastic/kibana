/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EXPIRE_TIME_LABEL = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.expireTime.expireTimeLabel',
  {
    defaultMessage: 'Exception will expire at',
  }
);

export const EXCEPTION_EXPIRE_TIME_HEADER = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.expireTime.exceptionExpireTime',
  {
    defaultMessage: 'Exception Expiration',
  }
);

export const EXCEPTION_EXPIRE_TIME_ERROR = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.expireTime.exceptionExpireTimeError',
  {
    defaultMessage: 'Selected date and time must be in the future.',
  }
);
