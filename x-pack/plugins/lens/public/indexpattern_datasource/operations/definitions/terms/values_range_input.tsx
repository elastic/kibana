/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { useDebounce } from 'react-use';
import { i18n } from '@kbn/i18n';
import { EuiRange } from '@elastic/eui';

type PropType<C> = C extends React.ComponentType<infer P> ? P : unknown;
// Add ticks to EuiRange component props
const FixedEuiRange = (EuiRange as unknown) as React.ComponentType<
  PropType<typeof EuiRange> & {
    ticks?: Array<{
      label: string;
      value: number;
    }>;
  }
>;

export const ValuesRangeInput = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) => {
  const MIN_NUMBER_OF_VALUES = 1;
  const MAX_NUMBER_OF_VALUES = 100;

  const [inputValue, setInputValue] = useState(String(value));
  useDebounce(
    () => {
      if (inputValue === '') {
        return;
      }
      const inputNumber = Number(inputValue);
      onChange(Math.min(MAX_NUMBER_OF_VALUES, Math.max(inputNumber, MIN_NUMBER_OF_VALUES)));
    },
    256,
    [inputValue]
  );

  return (
    <FixedEuiRange
      min={MIN_NUMBER_OF_VALUES}
      max={MAX_NUMBER_OF_VALUES}
      step={1}
      value={inputValue}
      showInput
      showLabels
      compressed
      onChange={({ currentTarget }) => setInputValue(currentTarget.value)}
      aria-label={i18n.translate('xpack.lens.indexPattern.terms.size', {
        defaultMessage: 'Number of values',
      })}
    />
  );
};
