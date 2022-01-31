/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { useDebounceWithOptions } from '../../../../shared_components';

export const ValuesInput = ({
  value,
  onChange,
  minValue = 1,
  maxValue = 1000,
  label = i18n.translate('xpack.lens.indexPattern.terms.size', {
    defaultMessage: 'Number of values',
  }),
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  minValue?: number;
  maxValue?: number;
  label?: string;
  disabled?: boolean;
}) => {
  const [inputValue, setInputValue] = useState(String(value));

  useDebounceWithOptions(
    () => {
      if (inputValue === '') {
        return;
      }
      const inputNumber = Number(inputValue);
      onChange(Math.min(maxValue, Math.max(inputNumber, minValue)));
    },
    { skipFirstRender: true },
    256,
    [inputValue]
  );

  const isEmptyString = inputValue === '';
  const isHigherThanMax = !isEmptyString && Number(inputValue) > maxValue;
  const isLowerThanMin = !isEmptyString && Number(inputValue) < minValue;

  return (
    <EuiFormRow
      label={label}
      display="rowCompressed"
      fullWidth
      isInvalid={isHigherThanMax || isLowerThanMin}
      error={
        isHigherThanMax
          ? [
              i18n.translate('xpack.lens.indexPattern.terms.sizeLimitMax', {
                defaultMessage:
                  'Value is higher than the maximum {max}, the maximum value is used instead.',
                values: {
                  max: maxValue,
                },
              }),
            ]
          : isLowerThanMin
          ? [
              i18n.translate('xpack.lens.indexPattern.terms.sizeLimitMin', {
                defaultMessage:
                  'Value is lower than the minimum {min}, the minimum value is used instead.',
                values: {
                  min: minValue,
                },
              }),
            ]
          : null
      }
    >
      <EuiFieldNumber
        min={minValue}
        max={maxValue}
        step={1}
        value={inputValue}
        compressed
        isInvalid={isHigherThanMax || isLowerThanMin}
        disabled={disabled}
        onChange={({ currentTarget }) => setInputValue(currentTarget.value)}
        aria-label={label}
        onBlur={() => {
          if (inputValue === '') {
            return setInputValue(String(value));
          }
          const inputNumber = Number(inputValue);
          setInputValue(String(Math.min(maxValue, Math.max(inputNumber, minValue))));
        }}
      />
    </EuiFormRow>
  );
};
