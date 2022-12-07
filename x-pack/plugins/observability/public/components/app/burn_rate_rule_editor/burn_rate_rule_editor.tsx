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
  const [shortWindowDuration, setShortWindowDuration] = useState<Duration>({ value: 5, unit: 'm' });
  const [burnRate, setBurnRate] = useState<number>(1);
  const [maxBurnRate, setMaxBurnRate] = useState<number>(1);

  const onLongWindowDurationChange = (duration: Duration) => {
    setLongWindowDuration(duration);
    setShortWindowDuration({ value: 5, unit: 'm' }); // TODO: compute 1/12th of long window duration
  };

  const onBurnRateChange = (value: number) => {
    setBurnRate(value);
  };

  const onSelectedSlo = (slo: SLO) => {
    setSelectedSlo(slo);
  };

  useEffect(() => {
    let sloDurationInMinutes = 1;
    if (selectedSlo) {
      sloDurationInMinutes = toMinutes(selectedSlo.timeWindow.duration);
    }
    const longWindowDurationInMinutes = toMinutes(longWindowDuration);
    setMaxBurnRate(Math.floor(sloDurationInMinutes / longWindowDurationInMinutes));
  }, [longWindowDuration, selectedSlo]); // depends on selected SLO as well as long window

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
  }

  assertNever(duration.unit);
}
