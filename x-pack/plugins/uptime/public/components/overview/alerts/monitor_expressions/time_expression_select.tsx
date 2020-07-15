/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AlertExpressionPopover } from '../alert_expression_popover';
import * as labels from '../translations';
import { AlertFieldNumber } from '../alert_field_number';
import { timeExpLabels } from './translations';
import { TimeUnitSelectable, TimeRangeOption } from './time_unit_selectable';

interface Props {
  defaultTimerangeCount?: number;
  defaultTimerangeUnit?: string;
  isEnabled?: boolean;
  setAlertParams: (key: string, value: any) => void;
}

const DEFAULT_TIMERANGE_UNIT = 'm';

const TimeRangeOptions: TimeRangeOption[] = [
  {
    'aria-label': labels.SECONDS_TIME_RANGE,
    'data-test-subj': 'xpack.uptime.alerts.monitorStatus.timerangeUnitSelectable.secondsOption',
    key: 's',
    label: labels.SECONDS,
  },
  {
    'aria-label': labels.MINUTES_TIME_RANGE,
    'data-test-subj': 'xpack.uptime.alerts.monitorStatus.timerangeUnitSelectable.minutesOption',
    key: 'm',
    label: labels.MINUTES,
  },
  {
    'aria-label': labels.HOURS_TIME_RANGE,
    'data-test-subj': 'xpack.uptime.alerts.monitorStatus.timerangeUnitSelectable.hoursOption',
    key: 'h',
    label: labels.HOURS,
  },
  {
    'aria-label': labels.DAYS_TIME_RANGE,
    'data-test-subj': 'xpack.uptime.alerts.monitorStatus.timerangeUnitSelectable.daysOption',
    key: 'd',
    label: labels.DAYS,
  },
];

export const TimeExpressionSelect: React.FC<Props> = ({
  defaultTimerangeCount,
  defaultTimerangeUnit,
  isEnabled,
  setAlertParams,
}) => {
  const [numUnits, setNumUnits] = useState<number>(defaultTimerangeCount ?? 15);

  const [timerangeUnitOptions, setTimerangeUnitOptions] = useState<any[]>(
    TimeRangeOptions.map((opt) =>
      opt.key === (defaultTimerangeUnit ?? DEFAULT_TIMERANGE_UNIT) ? { ...opt, checked: 'on' } : opt
    )
  );

  useEffect(() => {
    const timerangeUnit = timerangeUnitOptions.find(({ checked }) => checked === 'on')?.key ?? 'm';
    setAlertParams('timerangeUnit', timerangeUnit);
    setAlertParams('timerangeCount', numUnits);
  }, [numUnits, timerangeUnitOptions, setAlertParams]);

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={false}>
        <AlertExpressionPopover
          aria-label={labels.OPEN_THE_POPOVER_TIME_RANGE_VALUE}
          content={
            <AlertFieldNumber
              aria-label={labels.ENTER_NUMBER_OF_TIME_UNITS}
              data-test-subj="xpack.uptime.alerts.monitorStatus.timerangeValueField"
              disabled={false}
              fieldValue={numUnits}
              setFieldValue={setNumUnits}
            />
          }
          data-test-subj="xpack.uptime.alerts.monitorStatus.timerangeValueExpression"
          description={labels.ENTER_NUMBER_OF_TIME_UNITS_DESCRIPTION}
          id="timerange"
          isEnabled={isEnabled}
          value={labels.ENTER_NUMBER_OF_TIME_UNITS_VALUE(numUnits)}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <AlertExpressionPopover
          aria-label={timeExpLabels.OPEN_TIME_POPOVER}
          content={
            <TimeUnitSelectable
              aria-label={timeExpLabels.SELECT_TIME_RANGE_ARIA}
              data-test-subj="xpack.uptime.alerts.monitorStatus.timerangeUnitSelectable"
              headlineText={timeExpLabels.SELECT_TIME_RANGE_HEADLINE}
              onChange={(newOptions: Array<Pick<TimeRangeOption, 'checked'>>) => {
                if (newOptions.reduce((acc, { checked }) => acc || checked === 'on', false)) {
                  setTimerangeUnitOptions(newOptions);
                }
              }}
              timeRangeOptions={timerangeUnitOptions}
            />
          }
          data-test-subj="xpack.uptime.alerts.monitorStatus.timerangeUnitExpression"
          description=""
          id="timerange-unit"
          isEnabled={isEnabled}
          value={
            timerangeUnitOptions.find(({ checked }) => checked === 'on')?.label.toLowerCase() ?? ''
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
