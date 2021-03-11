/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Dispatch, SetStateAction } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AppDataType } from '../../types';

interface Props {
  selectedDataType: AppDataType | null;
  onChange: Dispatch<SetStateAction<AppDataType | null>>;
}

const dataTypes: { id: AppDataType; label: string }[] = [
  { id: 'synthetics', label: 'Synthetic Monitoring' },
  { id: 'rum', label: 'User Experience(RUM)' },
  { id: 'logs', label: 'Logs' },
  { id: 'metrics', label: 'Logs' },
  { id: 'apm', label: 'APM' },
];
export const DataTypesCol = ({ selectedDataType, onChange }: Props) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      {dataTypes.map(({ id: dt, label }) => (
        <EuiFlexItem key={dt}>
          <EuiButton
            size="s"
            iconSide="right"
            iconType="arrowRight"
            color={selectedDataType === dt ? 'primary' : 'text'}
            fill={selectedDataType === dt}
            onClick={() => onChange(dt === selectedDataType ? null : dt)}
          >
            {label}
          </EuiButton>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
