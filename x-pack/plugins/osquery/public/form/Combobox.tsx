/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFormRow, EuiComboBox } from '@elastic/eui';

import { useController } from 'react-hook-form';
import type { IFormFieldProps } from './types';

type Props = IFormFieldProps<string[]>;

export const ComboBoxField = ({
  euiFieldProps = {},
  name,
  label,
  labelAppend,
  idAria,
  helpText,
  ...rest
}: Props) => {
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    name,
    defaultValue: [],
    rules: {},
  });

  const onCreateComboOption = useCallback(
    (newValue: string) => {
      const result = [...(value as string[]), newValue];

      onChange(result);
    },
    [onChange, value]
  );

  const onComboChange = useCallback(
    (options: EuiComboBoxOptionOption[]) => {
      onChange(options.map((option) => option.label));
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
      {...rest}
    >
      <EuiComboBox
        isInvalid={hasError}
        noSuggestions
        placeholder={i18n.translate('xpack.osquery.comboBoxField.placeHolderText', {
          defaultMessage: 'Type and then hit "ENTER"',
        })}
        selectedOptions={value.map((v: string) => ({ label: v }))}
        onCreateOption={onCreateComboOption}
        onChange={onComboChange}
        fullWidth
        data-test-subj="input"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};
