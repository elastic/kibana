/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiRange, EuiFormRow } from '@elastic/eui';

import { FieldHook } from '../../../../shared_imports';

interface AnomalyThresholdSliderProps {
  describedByIds: string[];
  field: FieldHook;
}
type Event = React.ChangeEvent<HTMLInputElement>;
type EventArg = Event | React.MouseEvent<HTMLButtonElement>;

export const AnomalyThresholdSlider = ({
  describedByIds = [],
  field,
}: AnomalyThresholdSliderProps) => {
  const threshold = field.value as number;
  const onThresholdChange = useCallback(
    (event: EventArg) => {
      const thresholdValue = Number((event as Event).target.value);
      field.setValue(thresholdValue);
    },
    [field]
  );

  return (
    <EuiFormRow
      label={field.label}
      data-test-subj="anomalyThresholdSlider"
      describedByIds={describedByIds}
    >
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiRange
            value={threshold}
            onChange={onThresholdChange}
            fullWidth
            showInput
            showRange
            showTicks
            tickInterval={25}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
