/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ChangeEvent, useEffect, useState } from 'react';

import { Duration, DurationUnit } from '../../../typings';

interface DurationUnitOption {
  value: DurationUnit;
  text: string;
}

const durationUnitOptions: DurationUnitOption[] = [
  { value: 'm', text: 'minute' },
  { value: 'h', text: 'hour' },
];

const MIN_DURATION_IN_MINUTES = 30;
const MAX_DURATION_IN_MINUTES = 1440;
const MAX_DURATION_IN_HOURS = 24;

interface Props {
  initialDuration?: Duration;
  onChange: (duration: Duration) => void;
}

export function LongWindowDuration({ initialDuration, onChange }: Props) {
  const [durationValue, setDurationValue] = useState<number>(initialDuration?.value ?? 1);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>(
    initialDuration?.unit ?? durationUnitOptions[0].value
  );
  const [error, setError] = useState<string | undefined>(undefined);

  const onDurationValueChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setDurationValue(!isNaN(value) ? value : 1);
    onChange({ value, unit: durationUnit });
  };

  const onDurationUnitChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const unit = e.target.value === 'm' ? 'm' : 'h';
    setDurationUnit(unit);
    onChange({ value: durationValue, unit });
  };

  useEffect(() => {
    if (isValidDuration(durationValue, durationUnit)) {
      setError(undefined);
    } else {
      setError(errorText);
    }
  }, [durationValue, durationUnit]);

  const isValidDuration = (value: number, unit: DurationUnit): boolean => {
    return (
      (unit === 'm' && value >= MIN_DURATION_IN_MINUTES && value <= MAX_DURATION_IN_MINUTES) ||
      (unit === 'h' && value <= MAX_DURATION_IN_HOURS)
    );
  };

  const selectId = useGeneratedHtmlId({ prefix: 'durationUnitSelect' });
  return (
    <EuiFormRow label={rowLabel} fullWidth isInvalid={!!error} error={error}>
      <EuiFlexGroup direction="row">
        <EuiFlexItem grow={false} style={{ width: 100 }}>
          <EuiFieldNumber
            isInvalid={!!error}
            min={1}
            value={String(durationValue)}
            onChange={onDurationValueChange}
            aria-label={valueLabel}
            data-test-subj="durationValueInput"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSelect
            id={selectId}
            isInvalid={!!error}
            options={durationUnitOptions}
            value={durationUnit}
            onChange={onDurationUnitChange}
            aria-label={unitLabel}
            data-test-subj="durationUnitSelect"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
}

const rowLabel = i18n.translate('xpack.observability.slo.rules.longWindow.rowLabel', {
  defaultMessage: 'Long window',
});

const valueLabel = i18n.translate('xpack.observability.slo.rules.longWindow.valueLabel', {
  defaultMessage: 'Enter a duration value for the long window',
});

const unitLabel = i18n.translate('xpack.observability.slo.rules.longWindow.unitLabel', {
  defaultMessage: 'Select a duration unit for the long window',
});

const errorText = i18n.translate('xpack.observability.slo.rules.longWindow.errorText', {
  defaultMessage:
    'The long window must be at least 30 minutes and cannot exceed 24 hours or 1440 minutes.',
});
