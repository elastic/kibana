/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ChangeEvent, useState } from 'react';

interface Props {
  initialBurnRate?: number;
  maxBurnRate: number;
  errors?: string[];
  onChange: (burnRate: number) => void;
}

export function BurnRate({ onChange, initialBurnRate = 1, maxBurnRate, errors }: Props) {
  const [burnRate, setBurnRate] = useState<number>(initialBurnRate);
  const hasError = errors !== undefined && errors.length > 0;

  const onBurnRateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setBurnRate(value);
    onChange(value);
  };

  return (
    <EuiFormRow
      label={rowLabel}
      fullWidth
      isInvalid={hasError}
      error={hasError ? errors[0] : undefined}
    >
      <EuiFieldNumber
        fullWidth
        step={0.1}
        min={1}
        max={maxBurnRate}
        value={String(burnRate)}
        onChange={(event) => onBurnRateChange(event)}
        data-test-subj="burnRate"
      />
    </EuiFormRow>
  );
}

const rowLabel = i18n.translate('xpack.observability.slo.rules.burnRate.rowLabel', {
  defaultMessage: 'Burn rate threshold',
});
