/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useState, useEffect } from 'react';
import { AlertExpressionPopover } from '../alert_expression_popover';
import * as labels from '../translations';
import { AlertFieldNumber } from '../alert_field_number';

interface Props {
  setAlertParams: (key: string, value: any) => void;
}

export const AvailabilityExpressionSelect: React.FC<Props> = ({ setAlertParams }) => {
  const [range, setRange] = useState<number>(30);
  const [rangeUnit, setRangeUnit] = useState<string>('d');
  const [threshold, setThreshold] = useState<number>(0.99);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);

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
    <EuiFlexGroup gutterSize="s">
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
          value={labels.ENTER_AVAILABILITY_THRESHOLD_VALUE(threshold)}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <AlertExpressionPopover
          aria-label={labels.ENTER_AVAILABILITY_RANGE_POPOVER_ARIA_LABEL}
          content={
            <AlertFieldNumber
              aria-label={labels.ENTER_AVAILABILITY_RANGE_UNITS_ARIA_LABEL}
              data-test-subj="xpack.uptime.alerts.monitortatus.availability.timerangeValueField"
              disabled={false}
              fieldValue={range}
              setFieldValue={setRange}
            />
          }
          data-test-subj="xpack.uptime.alerts.monitorStatus.availability.timerangeExpression"
          description={labels.ENTER_AVAILABILITY_RANGE_UNITS_DESCRIPTION}
          id="range"
          value={`${range} ${rangeUnit}`}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
