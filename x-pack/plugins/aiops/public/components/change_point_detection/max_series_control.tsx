/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFieldNumber, EuiFormRow, EuiIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { type NumberValidationResult, numberValidator } from '@kbn/ml-agg-utils';
import { MAX_SERIES } from '../../embeddable/const';

const maxSeriesValidator = numberValidator({ min: 1, max: MAX_SERIES, integerOnly: true });

export const MaxSeriesControl: FC<{
  disabled?: boolean;
  value: number;
  onChange: (update: number) => void;
  onValidationChange?: (result: NumberValidationResult | null) => void;
  inline?: boolean;
}> = ({ value, onChange, onValidationChange, disabled, inline = true }) => {
  const maxSeriesValidationResult = maxSeriesValidator(value);
  const maxSeriesInvalid = maxSeriesValidationResult !== null;

  const label = i18n.translate('xpack.aiops.changePointDetection.maxSeriesToPlotLabel', {
    defaultMessage: 'Max series',
  });

  return (
    <EuiFormRow
      fullWidth
      isInvalid={maxSeriesInvalid}
      error={
        <FormattedMessage
          id="xpack.aiops.changePointDetection.maxSeriesToPlotError"
          defaultMessage="Max series value must be between {minValue} and {maxValue}"
          values={{ minValue: 1, maxValue: MAX_SERIES }}
        />
      }
      label={inline ? undefined : label}
    >
      <EuiFieldNumber
        data-test-subj="aiopsMaxSeriesControlFieldNumber"
        disabled={disabled}
        prepend={inline ? label : undefined}
        append={
          <EuiToolTip
            content={i18n.translate('xpack.aiops.changePointDetection.maxSeriesToPlotDescription', {
              defaultMessage: 'The maximum number of change points to visualize.',
            })}
          >
            <EuiIcon type={'questionInCircle'} />
          </EuiToolTip>
        }
        compressed
        fullWidth
        isInvalid={maxSeriesInvalid}
        value={value}
        onChange={(e) => {
          const newValue = Number(e.target.value);
          onChange(newValue);
          if (onValidationChange) {
            onValidationChange(maxSeriesValidator(newValue));
          }
        }}
        min={1}
        max={MAX_SERIES}
      />
    </EuiFormRow>
  );
};
