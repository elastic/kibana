/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldNumber, EuiFormRow, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ChangeEvent, useState } from 'react';

interface Props {
  initialBurnRate?: number;
  errors?: string[];
  onChange: (burnRate: number) => void;
  longLookbackWindowInHours: number;
  sloTimeWindowInHours: number;
}

export function BudgetConsumed({
  onChange,
  initialBurnRate = 1,
  longLookbackWindowInHours,
  sloTimeWindowInHours,
  errors,
}: Props) {
  const [budgetConsumed, setBudgetConsumed] = useState<number>(
    ((initialBurnRate * longLookbackWindowInHours) / sloTimeWindowInHours) * 100
  );
  const [formattedValue, setFormattedValue] = useState<string>(budgetConsumed.toFixed(2));
  const hasError = errors !== undefined && errors.length > 0;

  const onBudgetConsumedChanged = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setBudgetConsumed(value);
    const burnRate = sloTimeWindowInHours * (value / 100 / longLookbackWindowInHours);
    onChange(burnRate);
  };

  return (
    <EuiFormRow
      label={
        <>
          {i18n.translate('xpack.slo.rules.budgetConsumed.rowLabel', {
            defaultMessage: '% Budget consumed',
          })}{' '}
          <EuiIconTip
            position="top"
            content={i18n.translate('xpack.slo.rules.budgetConsumed.tooltip', {
              defaultMessage: 'How much budget is consumed before the first alert is fired.',
            })}
          />
        </>
      }
      fullWidth
      isInvalid={hasError}
    >
      <EuiFieldNumber
        fullWidth
        step={0.01}
        min={0.01}
        max={100}
        value={formattedValue}
        onChange={(event) => {
          onBudgetConsumedChanged(event);
          setFormattedValue(event.target.value);
        }}
        onBlur={(event) => {
          const value = event.target.value;
          setFormattedValue(Number(value).toFixed(2));
        }}
        data-test-subj="budgetConsumed"
      />
    </EuiFormRow>
  );
}
