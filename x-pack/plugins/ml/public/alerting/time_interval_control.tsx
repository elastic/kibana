/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText, EuiFormRow, EuiFieldTextProps } from '@elastic/eui';
import React, { FC, ReactNode, useMemo } from 'react';
import { invalidTimeIntervalMessage } from '../application/jobs/new_job/common/job_validator/util';
import { composeValidators } from '../../common';
import { timeIntervalInputValidator } from '../../common/util/validators';

type TimeIntervalControlProps = Omit<EuiFieldTextProps, 'value' | 'onChange'> & {
  label: string | ReactNode;
  value: string | null | undefined;
  onChange: (update: string) => void;
};

export const TimeIntervalControl: FC<TimeIntervalControlProps> = ({
  value,
  onChange,
  label,
  ...fieldTextProps
}) => {
  const validators = useMemo(() => composeValidators(timeIntervalInputValidator()), []);

  const validationErrors = useMemo(() => validators(value), [value]);

  const isInvalid = value !== undefined && !!validationErrors;

  return (
    <EuiFormRow
      label={label}
      isInvalid={isInvalid}
      error={invalidTimeIntervalMessage(value ?? undefined)}
    >
      <EuiFieldText
        {...fieldTextProps}
        placeholder="15d, 6m"
        value={value ?? ''}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        isInvalid={isInvalid}
      />
    </EuiFormRow>
  );
};
