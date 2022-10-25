/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { useController } from 'react-hook-form';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface NameFieldProps {
  euiFieldProps?: Record<string, unknown>;
}

const GlobalPackFieldComponent: React.FC<NameFieldProps> = ({ euiFieldProps }) => {
  const {
    field: { onChange, value, name: fieldName },
    fieldState: { error },
  } = useController({
    name: 'is_global',
    defaultValue: false,
  });

  const hasError = useMemo(() => !!error?.message, [error?.message]);
  const handleChange = useCallback(() => {
    onChange(!value);
  }, [onChange, value]);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.osquery.pack.form.nameFieldLabel', {
        defaultMessage: 'Global Pack',
      })}
      error={error?.message}
      isInvalid={hasError}
      fullWidth
    >
      <EuiSwitch
        onChange={handleChange}
        checked={value}
        label={'Global'}
        name={fieldName}
        data-test-subj="switch"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};

export const GlobalPackField = React.memo(GlobalPackFieldComponent);
