/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ChangeEvent, useEffect, useState } from 'react';

interface Props {
  maxBurnRate: number;
  onChange: (burnRate: number) => void;
}

export function BurnRate({ onChange, maxBurnRate }: Props) {
  const [burnRate, setBurnRate] = useState<number>(1);
  const [burnRateError, setBurnRateError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (burnRate > maxBurnRate) {
      setBurnRateError(getErrorText(maxBurnRate));
    } else {
      setBurnRateError(undefined);
    }
  }, [burnRate, maxBurnRate]);

  const onBurnRateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setBurnRate(value);
    onChange(value);
  };

  return (
    <EuiFormRow label={rowLabel} fullWidth isInvalid={!!burnRateError} error={burnRateError}>
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

const getErrorText = (maxBurnRate: number) =>
  i18n.translate('xpack.observability.slo.rules.burnRate.errorText', {
    defaultMessage: 'Burn rate cannot exceed {maxBurnRate}',
    values: { maxBurnRate },
  });
