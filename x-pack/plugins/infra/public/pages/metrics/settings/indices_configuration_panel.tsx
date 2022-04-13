/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { METRICS_INDEX_PATTERN } from '../../../../common/constants';
import { InputFieldProps } from './input_fields';

interface IndicesConfigurationPanelProps {
  isLoading: boolean;
  readOnly: boolean;
  metricAliasFieldProps: InputFieldProps;
}

export const IndicesConfigurationPanel = ({
  isLoading,
  readOnly,
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
    <EuiDescribedFormGroup
      title={
        <h4>
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.metricIndicesTitle"
            defaultMessage="Metrics indices"
          />
        </h4>
      }
      description={
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.metricIndicesDescription"
          defaultMessage="Index pattern for matching indices that contain metrics data"
        />
      }
    >
      <EuiFormRow
        error={metricAliasFieldProps.error}
        fullWidth
        helpText={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.metricIndicesRecommendedValue"
            defaultMessage="The recommended value is {defaultValue}"
            values={{
              defaultValue: <EuiCode>{METRICS_INDEX_PATTERN}</EuiCode>,
            }}
          />
        }
        isInvalid={metricAliasFieldProps.isInvalid}
        label={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.metricIndicesLabel"
            defaultMessage="Metrics indices"
          />
        }
      >
        <EuiFieldText
          data-test-subj="metricIndicesInput"
          fullWidth
          disabled={isLoading}
          readOnly={readOnly}
          isLoading={isLoading}
          {...metricAliasFieldProps}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  </EuiForm>
);
