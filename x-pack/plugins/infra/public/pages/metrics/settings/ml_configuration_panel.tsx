/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDescribedFormGroup,
  EuiForm,
  EuiFormRow,
  EuiRange,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { InputRangeFieldProps } from './input_fields';

interface MLConfigurationPanelProps {
  isLoading: boolean;
  readOnly: boolean;
  anomalyThresholdFieldProps: InputRangeFieldProps;
}

export const MLConfigurationPanel = ({
  isLoading,
  readOnly,
  anomalyThresholdFieldProps,
}: MLConfigurationPanelProps) => {
  return (
    <EuiForm>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.mlSectionTitle"
            defaultMessage="Machine Learning"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.anomalyThresholdTitle"
              defaultMessage="Anomaly Severity Threshold"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.anomalyThresholdDescription"
            defaultMessage="Sets the minimum severity score required to show anomalies in the Metrics application."
          />
        }
      >
        <EuiFormRow
          error={anomalyThresholdFieldProps.error}
          fullWidth
          isInvalid={anomalyThresholdFieldProps.isInvalid}
          label={
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.anomalyThresholdLabel"
              defaultMessage="Minimum severity score"
            />
          }
        >
          <EuiRange
            min={0}
            max={100}
            data-test-subj="anomalyThresholdInput"
            showInput
            showTicks
            showRange
            tickInterval={20}
            aria-label="Minimum severity score"
            disabled={isLoading}
            readOnly={readOnly}
            isLoading={isLoading}
            {...anomalyThresholdFieldProps}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </EuiForm>
  );
};
