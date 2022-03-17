/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { usePolicyConfigContext } from './contexts';
import { ConfigKey, MonitorFields, ScheduleUnit } from './types';

interface Props {
  number: string;
  onChange: (schedule: MonitorFields[ConfigKey.SCHEDULE]) => void;
  onBlur: () => void;
  unit: ScheduleUnit;
}

export const ScheduleField = ({ number, onChange, onBlur, unit }: Props) => {
  const { allowedScheduleUnits } = usePolicyConfigContext();
  const options = !allowedScheduleUnits?.length
    ? allOptions
    : allOptions.filter((opt) => allowedScheduleUnits.includes(opt.value));

  // When only minutes are allowed, don't allow user to input fractional value
  const allowedStep = options.length === 1 && options[0].value === ScheduleUnit.MINUTES ? 1 : 'any';

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
          step={allowedStep}
          min={1}
          value={number}
          onChange={(event) => {
            const updatedNumber = event.target.value;
            onChange({ number: updatedNumber, unit });
          }}
          onBlur={(event) => {
            // Enforce whole number
            if (allowedStep === 1) {
              const updatedNumber = `${Math.ceil(+event.target.value)}`;
              onChange({ number: updatedNumber, unit });
            }

            onBlur();
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
          onBlur={() => onBlur()}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const allOptions = [
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
