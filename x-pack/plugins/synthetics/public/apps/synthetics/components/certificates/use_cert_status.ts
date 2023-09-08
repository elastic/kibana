/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { CERT_STATUS, DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../common/constants';

export const useCertStatus = (expiryDate?: string, issueDate?: string) => {
  const expiryThreshold = DYNAMIC_SETTINGS_DEFAULTS.certExpirationThreshold;

  const ageThreshold = DYNAMIC_SETTINGS_DEFAULTS.certAgeThreshold;

  const certValidityDate = new Date(expiryDate ?? '');

  const isValidDate = !isNaN(certValidityDate.valueOf());

  if (!isValidDate) {
    return false;
  }

  const isExpiringSoon = moment(certValidityDate).diff(moment(), 'days') < expiryThreshold!;

  const isTooOld = moment().diff(moment(issueDate), 'days') > ageThreshold!;

  const isExpired = moment(certValidityDate) < moment();

  if (isExpired) {
    return CERT_STATUS.EXPIRED;
  }

  return isExpiringSoon
    ? CERT_STATUS.EXPIRING_SOON
    : isTooOld
    ? CERT_STATUS.TOO_OLD
    : CERT_STATUS.OK;
};
