/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import type { IPivotAggsConfigPercentiles, ValidationResultErrorType } from './types';

const errorMessages: Record<ValidationResultErrorType, string> = {
  INVALID_FORMAT: i18n.translate('xpack.transform.agg.popoverForm.invalidFormatError', {
    defaultMessage: 'Enter a comma-separated list of percentile',
  }),
  NEGATIVE_NUMBER: i18n.translate('xpack.transform.agg.popoverForm.negativeNumberError', {
    defaultMessage: 'Percentiles must be positive numbers',
  }),
  PERCENTILE_OUT_OF_RANGE: i18n.translate(
    'xpack.transform.agg.popoverForm.percentileOutOfRangeError',
    {
      defaultMessage: 'Percentiles must be between 0 and 100',
    }
  ),
};

export const PercentilesAggForm: IPivotAggsConfigPercentiles['AggFormComponent'] = ({
  aggConfig,
  onChange,
  isValid,
  errorMessageType,
}) => {
  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.transform.agg.popoverForm.percentsLabel', {
          defaultMessage: 'Percents',
        })}
        error={!isValid && [errorMessages[errorMessageType as ValidationResultErrorType]]}
        isInvalid={!isValid}
      >
        <EuiFieldText
          value={aggConfig.percents}
          onChange={(e) => {
            onChange({
              percents: e.target.value,
            });
          }}
        />
      </EuiFormRow>
    </>
  );
};
