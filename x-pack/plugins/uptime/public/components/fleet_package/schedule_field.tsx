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
  configKey: ConfigKeys;
  number: number;
  setFields: React.Dispatch<React.SetStateAction<ICustomFields>>;
  unit: string;
}

export const ScheduleField = ({ configKey, setFields, unit, number }: Props) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiFieldNumber
          min={1}
          value={number}
          onChange={(event) =>
            setFields((prevFields) => ({
              ...prevFields,
              [configKey]: {
                number: event.target.value,
                unit,
              },
            }))
          }
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSelect
          options={options}
          value={unit}
          onChange={(event) =>
            setFields((prevFields) => ({
              ...prevFields,
              [configKey]: {
                number,
                unit: event.target.value,
              },
            }))
          }
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
