/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiCode,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { InputFieldProps } from '../../../components/source_configuration';

interface IndicesConfigurationPanelProps {
  isLoading: boolean;
  readOnly: boolean;
  logAliasFieldProps: InputFieldProps;
}

export const IndicesConfigurationPanel = ({
  isLoading,
  readOnly,
  logAliasFieldProps,
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
    <EuiDescribedFormGroup
      title={
        <h4>
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.logIndicesTitle"
            defaultMessage="Log indices"
          />
        </h4>
      }
      description={
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.logIndicesDescription"
          defaultMessage="Index pattern for matching indices that contain log data"
        />
      }
    >
      <EuiFormRow
        error={logAliasFieldProps.error}
        fullWidth
        helpText={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.logIndicesRecommendedValue"
            defaultMessage="The recommended value is {defaultValue}"
            values={{
              defaultValue: <EuiCode>logs-*,filebeat-*</EuiCode>,
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
        <EuiFieldText
          data-test-subj="logIndicesInput"
          fullWidth
          disabled={isLoading}
          isLoading={isLoading}
          readOnly={readOnly}
          {...logAliasFieldProps}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  </EuiForm>
);
