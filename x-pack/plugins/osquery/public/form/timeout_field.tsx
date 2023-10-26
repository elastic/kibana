/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import deepEqual from 'fast-deep-equal';
import { useController } from 'react-hook-form';
import type { EuiFieldNumberProps } from '@elastic/eui';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const timeoutFieldValidations = {
  min: {
    message: i18n.translate('xpack.osquery.pack.queryFlyoutForm.timeoutFieldMinNumberError', {
      defaultMessage: 'Timeout value must be greater than {than} seconds.',
      values: { than: 60 },
    }),
    value: 60,
  },
  max: {
    message: i18n.translate('xpack.osquery.pack.queryFlyoutForm.timeoutFieldMaxNumberError', {
      defaultMessage: 'Timeout value must be lower than {than} seconds.',
      values: { than: 60 * 15 },
    }),
    value: 60 * 15,
  },
};

interface TimeoutFieldProps {
  euiFieldProps?: Record<string, unknown>;
}

const TimeoutFieldComponent = ({ euiFieldProps }: TimeoutFieldProps) => {
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    name: 'timeout',
    defaultValue: 60,
    rules: {
      ...timeoutFieldValidations,
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
      label={i18n.translate('xpack.osquery.liveQuery.timeout', {
        defaultMessage: 'Timeout (optional)',
      })}
      error={error?.message}
      isInvalid={hasError}
    >
      <EuiFieldNumber
        isInvalid={hasError}
        value={value as EuiFieldNumberProps['value']}
        onChange={handleChange}
        fullWidth
        type="number"
        data-test-subj="timeout-input"
        name="timeout"
        min={60}
        max={60 * 15}
        defaultValue={60}
        step={1}
        append="seconds"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};

export const TimeoutField = React.memo(TimeoutFieldComponent, deepEqual);
