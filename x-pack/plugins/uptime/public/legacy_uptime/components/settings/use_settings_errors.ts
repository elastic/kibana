/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { BLANK_STR, SPACE_STR } from '../../pages/translations';
import { isValidCertVal, SettingsPageFieldErrors } from '../../pages/settings';
import { validateEmail } from './default_email';
import { selectDynamicSettings } from '../../state/selectors';
import { PartialSettings } from './certificate_form';
import { connectorsSelector } from '../../state/alerts/alerts';

const hasInvalidEmail = (defaultConnectors?: string[], value?: PartialSettings['defaultEmail']) => {
  if (!defaultConnectors || defaultConnectors.length === 0) {
    return;
  }
  if (!value || !value.to) {
    return { to: REQUIRED_EMAIL };
  }

  const toError = value.to.length === 0 ? REQUIRED_EMAIL : getInvalidEmailError(value.to);
  const ccError = getInvalidEmailError(value.cc);
  const bccError = getInvalidEmailError(value.bcc);

  if (toError || ccError || bccError) {
    return {
      to: toError,
      cc: ccError,
      bcc: bccError,
    };
  }
};

const isEmailChanged = (
  prev?: PartialSettings['defaultEmail'],
  next?: PartialSettings['defaultEmail']
) => {
  if (!isEqual((prev?.to ?? []).sort(), (next?.to ?? []).sort())) {
    return true;
  }
  if (!isEqual((prev?.cc ?? []).sort(), (next?.cc ?? []).sort())) {
    return true;
  }
  if (!isEqual((prev?.bcc ?? []).sort(), (next?.bcc ?? []).sort())) {
    return true;
  }
};

const isDirtyForm = (formFields: PartialSettings | null, settings?: PartialSettings) => {
  return (
    settings?.certAgeThreshold !== formFields?.certAgeThreshold ||
    settings?.certExpirationThreshold !== formFields?.certExpirationThreshold ||
    settings?.heartbeatIndices !== formFields?.heartbeatIndices ||
    isEmailChanged(settings?.defaultEmail, formFields?.defaultEmail) ||
    JSON.stringify(settings?.defaultConnectors) !== JSON.stringify(formFields?.defaultConnectors)
  );
};

export const useSettingsErrors = (
  formFields: PartialSettings | null
): { errors: SettingsPageFieldErrors | null; isFormDirty: boolean } => {
  const dss = useSelector(selectDynamicSettings);

  const isFormDirty = isDirtyForm(formFields, dss.settings);

  const { data = [] } = useSelector(connectorsSelector);

  const hasEmailConnector = data?.find(
    (connector) =>
      formFields?.defaultConnectors?.includes(connector.id) && connector.actionTypeId === '.email'
  );

  if (formFields) {
    const { certAgeThreshold, certExpirationThreshold, heartbeatIndices } = formFields;

    const indErrorSpace = heartbeatIndices?.includes(' ') ? SPACE_STR : '';

    const indError = indErrorSpace || (heartbeatIndices?.match(/^\S+$/) ? '' : BLANK_STR);

    const ageError = isValidCertVal(certAgeThreshold);
    const expError = isValidCertVal(certExpirationThreshold);

    return {
      isFormDirty,
      errors: {
        heartbeatIndices: indError,
        expirationThresholdError: expError,
        ageThresholdError: ageError,
        invalidEmail: hasEmailConnector
          ? hasInvalidEmail(formFields.defaultConnectors, formFields.defaultEmail)
          : undefined,
      },
    };
  }

  return { isFormDirty, errors: null };
};

const REQUIRED_EMAIL = i18n.translate(
  'xpack.uptime.sourceConfiguration.alertDefaultForm.requiredEmail',
  {
    defaultMessage: 'To email is required for email connector',
  }
);

const getInvalidEmailError = (value?: string[]) => {
  if (!value) {
    return;
  }

  const inValidEmail = value.find((val) => !validateEmail(val));

  if (!inValidEmail) {
    return;
  }

  return i18n.translate('xpack.uptime.sourceConfiguration.alertDefaultForm.invalidEmail', {
    defaultMessage: '{val} is not a valid email.',
    values: { val: inValidEmail },
  });
};
