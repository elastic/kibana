/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFieldText, EuiForm, EuiFormRow, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { InputFieldProps } from './source_configuration_form_state';

interface FieldsConfigurationPanelProps {
  containerFieldProps: InputFieldProps;
  hostFieldProps: InputFieldProps;
  isLoading: boolean;
  podFieldProps: InputFieldProps;
  tiebreakerFieldProps: InputFieldProps;
  timestampFieldProps: InputFieldProps;
}

export const FieldsConfigurationPanel = ({
  containerFieldProps,
  hostFieldProps,
  isLoading,
  podFieldProps,
  tiebreakerFieldProps,
  timestampFieldProps,
}: FieldsConfigurationPanelProps) => (
  <EuiForm>
    <EuiTitle size="s">
      <h3>
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.fieldsSectionTitle"
          defaultMessage="Fields"
        />
      </h3>
    </EuiTitle>
    <EuiSpacer size="m" />
    <EuiFormRow
      fullWidth
      label={
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.timestampFieldLabel"
          defaultMessage="Timestamp"
        />
      }
    >
      <EuiFieldText fullWidth disabled={isLoading} isLoading={isLoading} {...timestampFieldProps} />
    </EuiFormRow>
    <EuiFormRow
      fullWidth
      label={
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.tiebreakerFieldLabel"
          defaultMessage="Tiebreaker"
        />
      }
    >
      <EuiFieldText
        fullWidth
        disabled={isLoading}
        isLoading={isLoading}
        {...tiebreakerFieldProps}
      />
    </EuiFormRow>
    <EuiFormRow
      fullWidth
      label={
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.containerFieldLabel"
          defaultMessage="Container ID"
        />
      }
    >
      <EuiFieldText fullWidth disabled={isLoading} isLoading={isLoading} {...containerFieldProps} />
    </EuiFormRow>
    <EuiFormRow
      fullWidth
      label={
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.hostFieldLabel"
          defaultMessage="Host name"
        />
      }
    >
      <EuiFieldText fullWidth disabled={isLoading} isLoading={isLoading} {...hostFieldProps} />
    </EuiFormRow>
    <EuiFormRow
      fullWidth
      label={
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.podFieldLabel"
          defaultMessage="Pod ID"
        />
      }
    >
      <EuiFieldText fullWidth disabled={isLoading} isLoading={isLoading} {...podFieldProps} />
    </EuiFormRow>
  </EuiForm>
);
