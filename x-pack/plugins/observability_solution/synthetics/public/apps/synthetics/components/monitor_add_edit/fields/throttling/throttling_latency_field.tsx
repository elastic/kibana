/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldNumber, EuiFormRow, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { Validation } from '../../../../../../../common/types';
import {
  ConfigKey,
  ThrottlingConfig,
  ThrottlingConfigValue,
} from '../../../../../../../common/runtime_types';
import { OptionalLabel } from '../optional_label';

export const ThrottlingLatencyField = ({
  throttling,
  readOnly,
  onFieldBlur,
  validate,
  handleInputChange,
  throttlingValue,
}: {
  readOnly?: boolean;
  handleInputChange: (value: string) => void;
  onFieldBlur?: (field: keyof ThrottlingConfigValue) => void;
  validate?: Validation;
  throttling: ThrottlingConfig;
  throttlingValue: ThrottlingConfigValue;
}) => {
  return (
    <EuiFormRow
      fullWidth
      label={LATENCY_LABEL}
      labelAppend={<OptionalLabel />}
      isInvalid={validate ? !!validate?.[ConfigKey.THROTTLING_CONFIG]?.(throttling) : false}
      error={LATENCY_NEGATIVE_ERROR}
    >
      <EuiFieldNumber
        fullWidth
        min={0}
        value={throttlingValue.latency}
        onChange={(event) => handleInputChange(event.target.value)}
        onBlur={() => onFieldBlur?.('latency')}
        data-test-subj="syntheticsBrowserLatency"
        append={
          <EuiText size="xs">
            <strong>ms</strong>
          </EuiText>
        }
        readOnly={readOnly}
      />
    </EuiFormRow>
  );
};

export const LATENCY_LABEL = i18n.translate(
  'xpack.synthetics.createPackagePolicy.stepConfigure.browserAdvancedSettings.throttling.latency.label',
  {
    defaultMessage: 'Latency',
  }
);

export const LATENCY_NEGATIVE_ERROR = i18n.translate(
  'xpack.synthetics.createPackagePolicy.stepConfigure.browserAdvancedSettings.throttling.latency.error',
  {
    defaultMessage: 'Latency must not be negative.',
  }
);
