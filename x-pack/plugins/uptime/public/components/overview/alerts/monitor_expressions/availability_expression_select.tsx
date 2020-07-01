/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCheckbox, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useState, useEffect } from 'react';
import { AlertExpressionPopover } from '../alert_expression_popover';
import * as labels from '../translations';
import { AlertFieldNumber } from '../alert_field_number';
import { TimeRangeOption, TimeUnitSelectable } from './time_unit_selectable';

interface Props {
  setAlertParams: (key: string, value: any) => void;
}

const TimeRangeOptions: TimeRangeOption[] = [
  {
    'aria-label': labels.DAYS_TIME_RANGE,
    'data-test-subj': 'xpack.uptime.alerts.monitorStatus.availability.timerangeUnit.daysOption',
    key: 'd',
    label: labels.DAYS,
  },
  {
    'aria-label': labels.WEEKS_TIME_RANGE,
    'data-test-subj': 'xpack.uptime.alerts.monitorStatus.availability.timerangeUnit.weeksOption',
    key: 'w',
    label: labels.WEEKS,
  },
  {
    'aria-label': labels.MONTHS_TIME_RANGE,
    'data-test-subj': 'xpack.uptime.alerts.monitorStatus.availability.timerangeUnit.monthsOption',
    key: 'M',
    label: labels.MONTHS,
  },
  {
    'aria-label': labels.YEARS_TIME_RANGE,
    'data-test-subj': 'xpack.uptime.alerts.monitorStatus.availability.timerangeUnit.yearsOption',
    key: 'y',
    label: labels.YEARS,
  },
];

const DEFAULT_TIMERANGE_UNIT = 'd';

export const AvailabilityExpressionSelect: React.FC<Props> = ({ setAlertParams }) => {
  const [range, setRange] = useState<number>(30);
  const [rangeUnit, setRangeUnit] = useState<string>('d');
  const [threshold, setThreshold] = useState<number>(0.99);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [timerangeUnitOptions, setTimerangeUnitOptions] = useState<TimeRangeOption[]>(
    TimeRangeOptions.map((opt) =>
      opt.key === DEFAULT_TIMERANGE_UNIT ? { ...opt, checked: 'on' } : opt
    )
  );

  useEffect(() => {
    if (isEnabled) {
      setAlertParams('shouldCheckAvailability', true);
      setAlertParams('availability', {
        range,
        rangeUnit,
        threshold,
      });
    } else {
      setAlertParams('shouldCheckAvailability', false);
    }
  }, [isEnabled, range, rangeUnit, setAlertParams, threshold]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiCheckbox
          id="availabilityRangeEnabled"
          label={labels.ENTER_AVAILABILITY_RANGE_ENABLED}
          checked={isEnabled}
          onChange={() => setIsEnabled(!isEnabled)}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <AlertExpressionPopover
          aria-label={labels.ENTER_AVAILABILITY_THRESHOLD_ARIA_LABEL}
          content={
            <AlertFieldNumber
              aria-label={labels.ENTER_AVAILABILITY_THRESHOLD_INPUT_ARIA_LABEL}
              data-test-subj="xpack.uptime.alerts.monitorStatus.availability.threshold.input"
              disabled={false}
              fieldValue={threshold}
              setFieldValue={setThreshold}
            />
          }
          data-test-subj="xpack.uptime.alerts.monitorStatus.availability.threshold"
          description={labels.ENTER_AVAILABILITY_THRESHOLD_DESCRIPTION}
          id="threshold"
          isEnabled={isEnabled}
          value={labels.ENTER_AVAILABILITY_THRESHOLD_VALUE(threshold)}
        />
      </EuiFlexItem>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <AlertExpressionPopover
            aria-label={labels.ENTER_AVAILABILITY_RANGE_POPOVER_ARIA_LABEL}
            content={
              <AlertFieldNumber
                aria-label={labels.ENTER_AVAILABILITY_RANGE_UNITS_ARIA_LABEL}
                data-test-subj="xpack.uptime.alerts.monitorStatus.availability.timerangeValueField"
                disabled={false}
                fieldValue={range}
                setFieldValue={setRange}
              />
            }
            data-test-subj="xpack.uptime.alerts.monitorStatus.availability.timerangeExpression"
            description={labels.ENTER_AVAILABILITY_RANGE_UNITS_DESCRIPTION}
            id="range"
            isEnabled={isEnabled}
            value={`${range}`}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <AlertExpressionPopover
            aria-label="xpack.uptime.alerts.monitorStatus.availability.timerangeUnit"
            content={
              <TimeUnitSelectable
                aria-label={labels.ENTER_AVAILABILITY_RANGE_SELECT_ARIA}
                data-test-subj="xpack.uptime.alerts.monitorStatus.availability.timerangeUnit.select"
                headlineText={labels.ENTER_AVAILABILITY_RANGE_SELECT_HEADLINE}
                onChange={(newOptions: TimeRangeOption[]) => {
                  const checkedOption = newOptions.find(({ checked }) => checked === 'on');
                  if (checkedOption) {
                    setTimerangeUnitOptions(newOptions);
                    setRangeUnit(checkedOption.key);
                  }
                }}
                timeRangeOptions={timerangeUnitOptions}
              />
            }
            data-test-subj="xpack.uptime.alerts.monitorStatus.availability.timerangeUnit"
            description=""
            id="availability-unit"
            isEnabled={isEnabled}
            value={
              timerangeUnitOptions.find(({ checked }) => checked === 'on')?.label.toLowerCase() ??
              ''
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
