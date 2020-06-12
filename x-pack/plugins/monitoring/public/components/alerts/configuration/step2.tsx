/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiForm, EuiFormRow, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AlertsConfigurationForm } from './configuration';

export interface GetStep2Props {
  emailAddress: string;
  setEmailAddress: (email: string) => void;
  showFormErrors: boolean;
  formErrors: AlertsConfigurationForm;
  isDisabled: boolean;
}

export const Step2: React.FC<GetStep2Props> = (props: GetStep2Props) => {
  return (
    <EuiForm isInvalid={props.showFormErrors}>
      <EuiFormRow
        label={i18n.translate('xpack.monitoring.alerts.configuration.emailAddressLabel', {
          defaultMessage: 'Email address',
        })}
        error={props.formErrors.email}
        isInvalid={props.showFormErrors && !!props.formErrors.email}
      >
        <EuiFieldText
          value={props.emailAddress}
          disabled={props.isDisabled}
          onChange={(e) => props.setEmailAddress(e.target.value)}
        />
      </EuiFormRow>
    </EuiForm>
  );
};
