/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';
import { ConfigKeys, ICustomFields, ScheduleUnit } from './types';

interface Props {
  number: string;
  onChange: (schedule: ICustomFields[ConfigKeys.SCHEDULE]) => void;
  unit: ScheduleUnit;
}

export const ScheduleField = ({ number, onChange, unit }: Props) => {
  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem>
        <EuiFieldNumber
          aria-label={i18n.translate(
            'xpack.uptime.createPackagePolicy.stepConfigure.scheduleField.number',
            {
              defaultMessage: 'Number',
            }
          )}
          id="syntheticsFleetScheduleField--number"
          data-test-subj="scheduleFieldInput"
          step={'any'}
          min={1}
          value={number}
          onChange={(event) => {
            const updatedNumber = event.target.value;
            onChange({ number: updatedNumber, unit });
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSelect
          aria-label={i18n.translate(
            'xpack.uptime.createPackagePolicy.stepConfigure.scheduleField.unit',
            {
              defaultMessage: 'Unit',
            }
          )}
          id="syntheticsFleetScheduleField--unit"
          data-test-subj="scheduleFieldSelect"
          options={options}
          value={unit}
          onChange={(event) => {
            const updatedUnit = event.target.value;
            onChange({ number, unit: updatedUnit as ScheduleUnit });
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const options = [
  {
    text: i18n.translate('xpack.uptime.createPackagePolicy.stepConfigure.scheduleField.seconds', {
      defaultMessage: 'Seconds',
    }),
    value: ScheduleUnit.SECONDS,
  },
  {
    text: i18n.translate('xpack.uptime.createPackagePolicy.stepConfigure.scheduleField.minutes', {
      defaultMessage: 'Minutes',
    }),
    value: ScheduleUnit.MINUTES,
  },
];
