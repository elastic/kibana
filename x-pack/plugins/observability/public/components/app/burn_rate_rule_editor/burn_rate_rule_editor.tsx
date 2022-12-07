/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';
import React, { useEffect, useState } from 'react';

import { Duration, SLO } from '../../../typings';
import { SloSelector } from '../../shared/slo/slo_selector/slo_selector';
import { BurnRate } from './burn_rate';
import { LongWindowDuration } from './long_window_duration';

export function BurnRateRuleEditor() {
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

  useEffect(() => {
    const sloWindowDurationInMinutes = 43200; // TODO: change when SloSelector used. 30 days in minutes
    const longWindowDurationInMinutes = toMinutes(longWindowDuration);
    setMaxBurnRate(Math.floor(sloWindowDurationInMinutes / longWindowDurationInMinutes));
  }, [longWindowDuration]); // depends on selected SLO as well as long window

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexGroup direction="row">
        <EuiFlexItem>
          <EuiFormRow label="Select SLO" fullWidth>
            <SloSelector
              onSelected={(slo: SLO) => {
                console.log(slo);
              }}
            />
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

function toMinutes(longWindowDuration: Duration) {
  return longWindowDuration.unit === 'm' ? longWindowDuration.value : longWindowDuration.value * 60;
}
