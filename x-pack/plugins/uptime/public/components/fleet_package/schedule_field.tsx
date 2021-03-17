/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';
import { ConfigKeys, ICustomFields, ScheduleUnit } from './types';

interface Props {
  number: string;
  onChange: (schedule: ICustomFields[ConfigKeys.SCHEDULE]) => void;
  unit: string;
}

export const ScheduleField = ({ number, onChange, unit }: Props) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiFieldNumber
          min={0}
          value={number}
          onChange={(event) => {
            const updatedNumber = event.target.value;
            onChange({ number: updatedNumber, unit });
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSelect
          options={options}
          value={unit}
          onChange={(event) => {
            const updatedUnit = event.target.value;
            onChange({ number, unit: updatedUnit });
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const options = [
  {
    text: 'Seconds',
    value: ScheduleUnit.SECONDS,
  },
  {
    text: 'Minutes',
    value: ScheduleUnit.MINUTES,
  },
];
