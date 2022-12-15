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
  EuiIcon,
  EuiSelect,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ChangeEvent, useState } from 'react';
import { toMinutes } from '../../../utils/slo/duration';

import { Duration, DurationUnit } from '../../../typings';

interface DurationUnitOption {
  value: DurationUnit;
  text: string;
}

const durationUnitOptions: DurationUnitOption[] = [
  { value: 'm', text: 'minute' },
  { value: 'h', text: 'hour' },
];

interface Props {
  shortWindowDuration: Duration;
  initialDuration?: Duration;
  errors?: string[];
  onChange: (duration: Duration) => void;
}

export function LongWindowDuration({
  shortWindowDuration,
  initialDuration,
  onChange,
  errors,
}: Props) {
  const selectId = useGeneratedHtmlId({ prefix: 'durationUnitSelect' });
  const [durationValue, setDurationValue] = useState<number>(initialDuration?.value ?? 1);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>(
    initialDuration?.unit ?? durationUnitOptions[0].value
  );
  const hasError = errors !== undefined && errors.length > 0;

  const onDurationValueChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setDurationValue(value);
    onChange({ value, unit: durationUnit });
  };

  const onDurationUnitChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const unit = e.target.value === 'm' ? 'm' : 'h';
    setDurationUnit(unit);
    onChange({ value: durationValue, unit });
  };

  return (
    <EuiFormRow
      label={getRowLabel(shortWindowDuration)}
      fullWidth
      isInvalid={hasError}
      error={hasError ? errors[0] : undefined}
    >
      <EuiFlexGroup direction="row">
        <EuiFlexItem grow={false} style={{ width: 100 }}>
          <EuiFieldNumber
            isInvalid={hasError}
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
            isInvalid={hasError}
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

const getRowLabel = (shortWindowDuration: Duration) => (
  <>
    {i18n.translate('xpack.observability.slo.rules.longWindow.rowLabel', {
      defaultMessage: 'Long window',
    })}{' '}
    <EuiToolTip position="top" content={getTooltipText(shortWindowDuration)}>
      <EuiIcon tabIndex={0} type="iInCircle" />
    </EuiToolTip>
  </>
);

const getTooltipText = (shortWindowDuration: Duration) =>
  i18n.translate('xpack.observability.slo.rules.longWindowDuration.tooltip', {
    defaultMessage:
      'Duration period to compute the burn rate over, and define the short window as {shortWindowDuration} minutes (1/12th)',
    values: { shortWindowDuration: toMinutes(shortWindowDuration) },
  });

const valueLabel = i18n.translate('xpack.observability.slo.rules.longWindow.valueLabel', {
  defaultMessage: 'Enter a duration value for the long window',
});

const unitLabel = i18n.translate('xpack.observability.slo.rules.longWindow.unitLabel', {
  defaultMessage: 'Select a duration unit for the long window',
});
