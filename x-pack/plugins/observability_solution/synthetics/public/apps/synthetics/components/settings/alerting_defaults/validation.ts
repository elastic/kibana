/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DefaultEmail as DefaultEmailType } from '../../../../../../common/runtime_types';

export const validateEmail = (email: string) => {
  return email
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
};

const REQUIRED_EMAIL = i18n.translate('xpack.synthetics.settings.alertDefaultForm.requiredEmail', {
  defaultMessage: 'To: Email is required for selected email connector',
});

const getInvalidEmailError = (value?: string[]) => {
  if (!value) {
    return;
  }

  const inValidEmail = value.find((val) => !validateEmail(val));

  if (!inValidEmail) {
    return;
  }

  return i18n.translate('xpack.synthetics.sourceConfiguration.alertDefaultForm.invalidEmail', {
    defaultMessage: '{val} is not a valid email.',
    values: { val: inValidEmail },
  });
};

export const hasInvalidEmail = (
  defaultConnectors?: string[],
  value?: Partial<DefaultEmailType>,
  isTouched?: boolean
): {
  to?: string;
  cc?: string;
  bcc?: string;
} => {
  if (!defaultConnectors || defaultConnectors.length === 0 || isTouched === false) {
    return {};
  }
  if (!value || !value.to) {
    return { to: REQUIRED_EMAIL };
  }

  const toError = value.to.length === 0 ? REQUIRED_EMAIL : getInvalidEmailError(value.to);
  const ccError = getInvalidEmailError(value.cc);
  const bccError = getInvalidEmailError(value.bcc);

  if (toError || ccError || bccError) {
    return {
      to: toError ?? '',
      cc: ccError ?? '',
      bcc: bccError ?? '',
    };
  }
  return {};
};
