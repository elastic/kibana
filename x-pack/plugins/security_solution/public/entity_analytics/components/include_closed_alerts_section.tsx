/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiSuperDatePicker,
  EuiButton,
  EuiText,
  EuiFlexGroup,
  EuiSwitch,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { useConfigureSORiskEngineMutation } from '../api/hooks/use_configure_risk_engine';

export const IncludeClosedAlertsSection = ({
  includeClosedAlerts,
  setIncludeClosedAlerts,
  from,
  to,
  onDateChange,
}: {
  includeClosedAlerts: boolean;
  setIncludeClosedAlerts: (value: boolean) => void;
  from: string;
  to: string;
  onDateChange: ({ start, end }: { start: string; end: string }) => void;
}) => {
  const [start, setFrom] = useState(from);
  const [end, setTo] = useState(to);
  const [isLoading, setIsLoading] = useState(false);

  const onRefresh = ({ start: newStart, end: newEnd }: { start: string; end: string }) => {
    setFrom(newStart);
    setTo(newEnd);
    onDateChange({ start: newStart, end: newEnd });
  };

  const handleToggle = () => {
    setIncludeClosedAlerts(!includeClosedAlerts);
  };

  const configureRiskEngineMutation = useConfigureSORiskEngineMutation({
    onMutate: () => setIsLoading(true),
    onSettled: () => setIsLoading(false),
  });

  const handleSave = () => {
    configureRiskEngineMutation.mutate({
      includeClosedAlerts,
      range: { start, end },
    });
  };

  return (
    <>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label="Include closed alerts for risk scoring"
            checked={includeClosedAlerts}
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
            onTimeChange={({ start: newStart, end: newEnd }) =>
              onRefresh({ start: newStart, end: newEnd })
            }
            width={'auto'}
            compressed={false}
            showUpdateButton={false}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText size="s" style={{ marginTop: '10px' }}>
        <p>
          {`Enable this option to factor both open and closed alerts into the risk engine
          calculations. Including closed alerts helps provide a more comprehensive risk assessment
          based on past incidents, leading to more accurate scoring and insights.`}
        </p>
      </EuiText>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton fill iconType="save" size="m" onClick={handleSave} isLoading={isLoading}>
            {'Save'}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
