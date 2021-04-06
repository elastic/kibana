/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AppDataType } from '../../types';
import { useIndexPatternContext } from '../../hooks/use_default_index_pattern';
import { NEW_SERIES_KEY, useUrlStorage } from '../../hooks/use_url_strorage';

export const dataTypes: Array<{ id: AppDataType; label: string }> = [
  { id: 'synthetics', label: 'Synthetic Monitoring' },
  { id: 'rum', label: 'User Experience(RUM)' },
  { id: 'logs', label: 'Logs' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'apm', label: 'APM' },
];

export function DataTypesCol() {
  const { series, setSeries } = useUrlStorage(NEW_SERIES_KEY);

  const { loadIndexPattern } = useIndexPatternContext();

  const onDataTypeChange = (dataType?: AppDataType) => {
    if (dataType) {
      loadIndexPattern(dataType);
    }
    setSeries(NEW_SERIES_KEY, { dataType } as any);
  };

  const selectedDataType = series.dataType;

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      {dataTypes.map(({ id: dataTypeId, label }) => (
        <EuiFlexItem key={dataTypeId}>
          <EuiButton
            size="s"
            iconSide="right"
            iconType="arrowRight"
            color={selectedDataType === dataTypeId ? 'primary' : 'text'}
            fill={selectedDataType === dataTypeId}
            onClick={() => {
              onDataTypeChange(dataTypeId === selectedDataType ? undefined : dataTypeId);
            }}
          >
            {label}
          </EuiButton>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
