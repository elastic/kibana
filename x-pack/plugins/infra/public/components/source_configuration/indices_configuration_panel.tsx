/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCode, EuiFieldText, EuiForm, EuiFormRow, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { InputFieldProps } from './source_configuration_form_state';

interface IndicesConfigurationPanelProps {
  isLoading: boolean;
  logAliasFieldProps: InputFieldProps;
  metricAliasFieldProps: InputFieldProps;
}

export const IndicesConfigurationPanel = ({
  isLoading,
  logAliasFieldProps,
  metricAliasFieldProps,
}: IndicesConfigurationPanelProps) => (
  <EuiForm>
    <EuiTitle size="s">
      <h3>
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.indicesSectionTitle"
          defaultMessage="Indices"
        />
      </h3>
    </EuiTitle>
    <EuiSpacer size="m" />
    <EuiFormRow
      error={metricAliasFieldProps.error}
      fullWidth
      helpText={
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.metricIndicesDescription"
          defaultMessage="Index pattern for matching indices that contain Metricbeat data. The recommended value is {defaultValue}."
          values={{
            defaultValue: <EuiCode>metricbeat-*</EuiCode>,
          }}
        />
      }
      isInvalid={metricAliasFieldProps.isInvalid}
      label={
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.metricIndicesLabel"
          defaultMessage="Metric indices"
        />
      }
    >
      <EuiFieldText
        fullWidth
        disabled={isLoading}
        isLoading={isLoading}
        {...metricAliasFieldProps}
      />
    </EuiFormRow>
    <EuiFormRow
      error={logAliasFieldProps.error}
      fullWidth
      helpText={
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.logIndicesDescription"
          defaultMessage="Index pattern for matching indices that contain log data. The recommended value is {defaultValue}."
          values={{
            defaultValue: <EuiCode>filebeat-*</EuiCode>,
          }}
        />
      }
      isInvalid={logAliasFieldProps.isInvalid}
      label={
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.logIndicesLabel"
          defaultMessage="Log indices"
        />
      }
    >
      <EuiFieldText fullWidth disabled={isLoading} isLoading={isLoading} {...logAliasFieldProps} />
    </EuiFormRow>
  </EuiForm>
);
