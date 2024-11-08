/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { OnTimeChangeProps, EuiSuperDatePickerProps } from '@elastic/eui';
import {
  EuiSuperDatePicker,
  EuiButton,
  EuiText,
  EuiFlexGroup,
  EuiSwitch,
  EuiFlexItem,
} from '@elastic/eui';

export const IncludeClosedAlertsSection = ({
  width,
  compressed,
}: {
  width: EuiSuperDatePickerProps['width'];
  compressed: boolean;
}) => {
  const [isToggled, setIsToggled] = useState(false);
  const [start, setStart] = useState('now-30m');
  const [end, setEnd] = useState('now');

  const onTimeChange = ({ start: newStart, end: newEnd }: OnTimeChangeProps) => {
    setStart(newStart);
    setEnd(newEnd);
  };

  const handleToggle = () => {
    setIsToggled(!isToggled);
  };

  return (
    <>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label="Include closed alerts for risk scoring"
            checked={isToggled}
            onChange={handleToggle}
          />
        </EuiFlexItem>
        <div
          className="vertical-line"
          style={{ height: '24px', borderLeft: '1px solid #ccc', margin: '0 8px' }}
        />
        <EuiFlexItem grow={false}>
          <EuiSuperDatePicker
            start={start}
            end={end}
            onTimeChange={onTimeChange}
            width={'auto'}
            compressed={compressed}
            showUpdateButton={false}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill iconType="save">
            {'Save'}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText size="s" style={{ marginTop: '10px' }}>
        <p>
          {`Enable this option to factor both open and closed alerts into the risk engine
          calculations. Including closed alerts helps provide a more comprehensive risk assessment
          based on past incidents, leading to more accurate scoring and insights.`}
        </p>
      </EuiText>
    </>
  );
};
