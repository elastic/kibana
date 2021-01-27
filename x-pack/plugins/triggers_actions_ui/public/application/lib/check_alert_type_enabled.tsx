/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { upperFirst } from 'lodash';
import { i18n } from '@kbn/i18n';
import { AlertType } from '../../types';

export interface IsEnabledResult {
  isEnabled: true;
}
export interface IsDisabledResult {
  isEnabled: false;
  message: string;
}

const getLicenseCheckResult = (alertType: AlertType) => {
  return {
    isEnabled: false,
    message: i18n.translate(
      'xpack.triggersActionsUI.checkAlertTypeEnabled.alertTypeDisabledByLicenseMessage',
      {
        defaultMessage: 'This alert type requires a {minimumLicenseRequired} license.',
        values: {
          minimumLicenseRequired: upperFirst(alertType.minimumLicenseRequired),
        },
      }
    ),
  };
};

export function checkAlertTypeEnabled(alertType?: AlertType): IsEnabledResult | IsDisabledResult {
  if (alertType?.enabledInLicense === false) {
    return getLicenseCheckResult(alertType);
  }

  return { isEnabled: true };
}
