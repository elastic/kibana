/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { InputFieldProps } from './input_fields';

interface NameConfigurationPanelProps {
  isLoading: boolean;
  readOnly: boolean;
  nameFieldProps: InputFieldProps;
}

export const NameConfigurationPanel = ({
  isLoading,
  readOnly,
  nameFieldProps,
}: NameConfigurationPanelProps) => (
  <EuiForm>
    <EuiTitle size="s" data-test-subj="sourceConfigurationNameSectionTitle">
      <h3>
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.nameSectionTitle"
          defaultMessage="Name"
        />
      </h3>
    </EuiTitle>
    <EuiSpacer size="m" />
    <EuiDescribedFormGroup
      title={
        <h4>
          <FormattedMessage id="xpack.infra.sourceConfiguration.nameLabel" defaultMessage="Name" />
        </h4>
      }
      description={
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.nameDescription"
          defaultMessage="A descriptive name for the source configuration"
        />
      }
    >
      <EuiFormRow
        error={nameFieldProps.error}
        fullWidth
        isInvalid={nameFieldProps.isInvalid}
        label={
          <FormattedMessage id="xpack.infra.sourceConfiguration.nameLabel" defaultMessage="Name" />
        }
      >
        <EuiFieldText
          data-test-subj="nameInput"
          fullWidth
          disabled={isLoading}
          readOnly={readOnly}
          isLoading={isLoading}
          {...nameFieldProps}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  </EuiForm>
);
