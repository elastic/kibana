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
}: {
  value: number;
  onChange: (value: number) => void;
}) => {
  const MIN_NUMBER_OF_VALUES = 1;
  const MAX_NUMBER_OF_VALUES = 1000;

  const [inputValue, setInputValue] = useState(String(value));

  useDebounceWithOptions(
    () => {
      if (inputValue === '') {
        return;
      }
      const inputNumber = Number(inputValue);
      onChange(Math.min(MAX_NUMBER_OF_VALUES, Math.max(inputNumber, MIN_NUMBER_OF_VALUES)));
    },
    { skipFirstRender: true },
    256,
    [inputValue]
  );

  const isEmptyString = inputValue === '';
  const isHigherThanMax = !isEmptyString && Number(inputValue) > MAX_NUMBER_OF_VALUES;
  const isLowerThanMin = !isEmptyString && Number(inputValue) < MIN_NUMBER_OF_VALUES;

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.indexPattern.terms.size', {
        defaultMessage: 'Number of values',
      })}
      display="columnCompressed"
      fullWidth
      isInvalid={isHigherThanMax || isLowerThanMin}
      error={
        isHigherThanMax
          ? [
              i18n.translate('xpack.lens.indexPattern.terms.sizeLimitMax', {
                defaultMessage:
                  'Value is higher than the maximum {max}, the maximum value is used instead.',
                values: {
                  max: MAX_NUMBER_OF_VALUES,
                },
              }),
            ]
          : isLowerThanMin
          ? [
              i18n.translate('xpack.lens.indexPattern.terms.sizeLimitMin', {
                defaultMessage:
                  'Value is lower than the minimum {min}, the minimum value is used instead.',
                values: {
                  min: MIN_NUMBER_OF_VALUES,
                },
              }),
            ]
          : null
      }
    >
      <EuiFieldNumber
        min={MIN_NUMBER_OF_VALUES}
        max={MAX_NUMBER_OF_VALUES}
        step={1}
        value={inputValue}
        compressed
        isInvalid={isHigherThanMax || isLowerThanMin}
        onChange={({ currentTarget }) => setInputValue(currentTarget.value)}
        aria-label={i18n.translate('xpack.lens.indexPattern.terms.size', {
          defaultMessage: 'Number of values',
        })}
        onBlur={() => {
          if (inputValue === '') {
            return setInputValue(String(value));
          }
          const inputNumber = Number(inputValue);
          setInputValue(
            String(Math.min(MAX_NUMBER_OF_VALUES, Math.max(inputNumber, MIN_NUMBER_OF_VALUES)))
          );
        }}
      />
    </EuiFormRow>
  );
};
