/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import React, { FC, ReactNode, useMemo } from 'react';
import { invalidTimeIntervalMessage } from '../application/jobs/new_job/common/job_validator/util';
import { composeValidators } from '../../common';
import { requiredValidator, timeIntervalInputValidator } from '../../common/util/validators';

interface TimeIntervalControlProps {
  label: string | ReactNode;
  value: string | null | undefined;
  onChange: (update: string) => void;
}

export const TimeIntervalControl: FC<TimeIntervalControlProps> = ({ value, onChange, label }) => {
  const validators = useMemo(
    () => composeValidators(requiredValidator(), timeIntervalInputValidator()),
    []
  );

  const validationErrors = useMemo(() => validators(value), [value]);

  const isInvalid = value !== undefined && !!validationErrors;

  return (
    <EuiFormRow
      label={label}
      isInvalid={isInvalid}
      error={invalidTimeIntervalMessage(value ?? undefined)}
    >
      <EuiFieldText
        placeholder="15d, 6m"
        value={value ?? ''}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        isInvalid={isInvalid}
        data-test-subj={'mlAnomalyAlertPreviewInterval'}
      />
    </EuiFormRow>
  );
};
