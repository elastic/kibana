/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { assertNever } from '@kbn/std';
import React, { useEffect, useState } from 'react';

import { Duration, SLO } from '../../../typings';
import { SloSelector } from '../../shared/slo/slo_selector/slo_selector';
import { BurnRate } from './burn_rate';
import { LongWindowDuration } from './long_window_duration';

export function BurnRateRuleEditor() {
  const [selectedSlo, setSelectedSlo] = useState<SLO | undefined>(undefined);
  const [longWindowDuration, setLongWindowDuration] = useState<Duration>({ value: 1, unit: 'h' });
  const [, setShortWindowDuration] = useState<Duration>({ value: 5, unit: 'm' });
  const [, setBurnRate] = useState<number>(1);
  const [maxBurnRate, setMaxBurnRate] = useState<number>(1);

  const onLongWindowDurationChange = (duration: Duration) => {
    setLongWindowDuration(duration);
    const longWindowdurationInMinutes = toMinutes(duration);
    const shortWindowDurationValue = Math.floor(longWindowdurationInMinutes / 12);
    setShortWindowDuration({ value: shortWindowDurationValue, unit: 'm' });
  };

  const onBurnRateChange = (value: number) => {
    setBurnRate(value);
  };

  const onSelectedSlo = (slo: SLO | undefined) => {
    setSelectedSlo(slo);
  };

  useEffect(() => {
    if (selectedSlo) {
      const sloDurationInMinutes = toMinutes(selectedSlo.timeWindow.duration);
      const longWindowDurationInMinutes = toMinutes(longWindowDuration);
      setMaxBurnRate(Math.floor(sloDurationInMinutes / longWindowDurationInMinutes));
    } else {
      setMaxBurnRate(1);
    }
  }, [longWindowDuration, selectedSlo]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexGroup direction="row">
        <EuiFlexItem>
          <EuiFormRow label="Select SLO" fullWidth>
            <SloSelector onSelected={onSelectedSlo} />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup direction="row">
        <EuiFlexItem>
          <LongWindowDuration
            initialDuration={longWindowDuration}
            onChange={onLongWindowDurationChange}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <BurnRate maxBurnRate={maxBurnRate} onChange={onBurnRateChange} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
    </EuiFlexGroup>
  );
}

function toMinutes(duration: Duration) {
  switch (duration.unit) {
    case 'm':
      return duration.value;
    case 'h':
      return duration.value * 60;
    case 'd':
      return duration.value * 24 * 60;
    case 'w':
      return duration.value * 7 * 24 * 60;
    case 'M':
      return duration.value * 30 * 24 * 60;
    case 'Y':
      return duration.value * 365 * 24 * 60;
  }

  assertNever(duration.unit);
}
