/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';

interface Options {
  value: string;
  text: string;
}

export const singleLastOptions: Options[] = [
  {
    value: 'minutes',
    text: 'minute',
  },
  {
    value: 'hours',
    text: 'hour',
  },
];

export const pluralLastOptions: Options[] = [
  {
    value: 'minutes',
    text: 'minutes',
  },
  {
    value: 'hours',
    text: 'hours',
  },
];

interface Props {
  timerIsOn: boolean;
  interval: number;
  intervalType: string;
  onChange: (
    stateType: string,
    args: React.FormEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>
  ) => void;
  toggleTimer: (timerIsOn: boolean) => void;
}

export const Timer = pure<Props>(({ onChange, timerIsOn, interval, intervalType, toggleTimer }) => (
  <>
    <EuiTitle size="xxxs">
      <span>Refresh every</span>
    </EuiTitle>
    <EuiSpacer size="s" />
    <EuiFlexGroup gutterSize="s" responsive={false}>
      <EuiFlexItem>
        <EuiFormRow>
          <EuiFieldNumber
            aria-label="Count of"
            defaultValue="1"
            value={interval}
            step={0}
            onChange={arg => {
              onChange('interval', arg);
            }}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow>
          <EuiSelect
            aria-label="Count Type"
            defaultValue="minutes"
            value={intervalType}
            options={interval === 1 ? singleLastOptions : pluralLastOptions}
            onChange={arg => {
              onChange('intervalType', arg);
            }}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFormRow>
          <EuiButton
            iconType={timerIsOn ? 'stop' : 'play'}
            size="s"
            onClick={toggleTimer.bind(!timerIsOn)}
            style={{ minWidth: 90 }}
          >
            {timerIsOn ? 'Stop' : 'Start'}
          </EuiButton>
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
));
