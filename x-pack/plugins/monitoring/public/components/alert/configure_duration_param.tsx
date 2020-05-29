/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiFieldNumber, EuiSelect } from '@elastic/eui';

import { getTimeUnitLabel, TIME_UNITS } from '../../../../triggers_actions_ui/public';

interface AlertPopoverConfigureDurationParamProps {
  name: string;
  duration: string;
  setBody: (body: any) => void;
}

const parseRegex = /(\d+)(\w+)/;
export const AlertPopoverConfigureDurationParam: React.FC<AlertPopoverConfigureDurationParamProps> = (
  props: AlertPopoverConfigureDurationParamProps
) => {
  const { name, setBody } = props;
  const parsed = parseRegex.exec(props.duration);
  const defaultValue = parsed && parsed[1] ? parseInt(parsed[1], 10) : 1;
  const defaultUnit = parsed && parsed[2] ? parsed[2] : TIME_UNITS.MINUTE;
  const [value, setValue] = React.useState(defaultValue);
  const [unit, setUnit] = React.useState(defaultUnit);

  const timeUnits = Object.values(TIME_UNITS).map((timeUnit) => ({
    value: timeUnit,
    text: getTimeUnitLabel(timeUnit),
  }));

  React.useEffect(() => {
    setBody({
      [name]: `${value}${unit}`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, value]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={2}>
        <EuiFieldNumber
          compressed
          value={value}
          onChange={(e) => setValue(parseInt(e.target.value, 10))}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={4}>
        <EuiSelect
          compressed
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          options={timeUnits}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
