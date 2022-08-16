/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';

import { useController } from 'react-hook-form';
import type { EuiFieldNumberProps } from '@elastic/eui';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import type { IFormFieldProps } from './types';

interface IProps extends IFormFieldProps<number> {
  validation: Record<string, unknown>;
}

export const NumberField = (props: IProps) => {
  const { name, defaultValue, validation, helpText, label, labelAppend, idAria, euiFieldProps } =
    props;
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    name,
    defaultValue: defaultValue || 0,
    rules: {
      ...validation,
    },
  });
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const numberValue = e.target.valueAsNumber ? e.target.valueAsNumber : 0;
      onChange(numberValue);
    },
    [onChange]
  );
  const hasError = useMemo(() => !!error?.message, [error?.message]);

  return (
    <EuiFormRow
      label={label}
      labelAppend={labelAppend}
      helpText={typeof helpText === 'function' ? helpText() : helpText}
      error={error?.message}
      isInvalid={hasError}
      fullWidth
      // eslint-disable-next-line react-perf/jsx-no-new-array-as-prop
      describedByIds={idAria ? [idAria] : undefined}
    >
      <EuiFieldNumber
        isInvalid={hasError}
        value={value as EuiFieldNumberProps['value']}
        onChange={handleChange}
        fullWidth
        type="number"
        data-test-subj="input"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};
