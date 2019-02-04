/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFieldText, EuiForm, EuiFormRow, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { InputFieldProps } from './source_configuration_form_state';

interface NameConfigurationPanelProps {
  isLoading: boolean;
  nameFieldProps: InputFieldProps;
}

export const NameConfigurationPanel = ({
  isLoading,
  nameFieldProps,
}: NameConfigurationPanelProps) => (
  <EuiForm>
    <EuiTitle size="s">
      <h3>
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.nameSectionTitle"
          defaultMessage="Name"
        />
      </h3>
    </EuiTitle>
    <EuiSpacer size="m" />
    <EuiFormRow
      error={nameFieldProps.error}
      fullWidth
      isInvalid={nameFieldProps.isInvalid}
      label={
        <FormattedMessage id="xpack.infra.sourceConfiguration.nameLabel" defaultMessage="Name" />
      }
    >
      <EuiFieldText fullWidth disabled={isLoading} isLoading={isLoading} {...nameFieldProps} />
    </EuiFormRow>
  </EuiForm>
);
