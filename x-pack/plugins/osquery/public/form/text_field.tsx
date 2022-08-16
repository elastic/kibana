/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';

import { useController } from 'react-hook-form';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import type { IFormFieldProps } from './types';

type IProps = IFormFieldProps<string>;

export const TextField = (props: IProps) => {
  const { idAria, labelAppend, helpText, rules } = props;
  const {
    field: { onChange, value, name },
    fieldState: { error },
  } = useController({
    name: props.name,
    defaultValue: '',
    rules,
  });

  const hasError = useMemo(() => !!error?.message, [error?.message]);

  return (
    <EuiFormRow
      label={props.label}
      labelAppend={labelAppend}
      helpText={typeof helpText === 'function' ? helpText() : helpText}
      error={error?.message}
      isInvalid={hasError}
      fullWidth
      // eslint-disable-next-line react-perf/jsx-no-new-array-as-prop
      describedByIds={idAria ? [idAria] : undefined}
    >
      <EuiFieldText
        isInvalid={hasError}
        onChange={onChange}
        value={value}
        name={name}
        fullWidth
        data-test-subj="input"
        {...props.euiFieldProps}
      />
    </EuiFormRow>
  );
};
