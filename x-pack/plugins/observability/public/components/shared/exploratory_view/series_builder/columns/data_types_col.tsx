/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { AppDataType } from '../../types';
import { useAppIndexPatternContext } from '../../hooks/use_app_index_pattern';
import { useUrlStorage } from '../../hooks/use_url_storage';
import { ReportToDataTypeMap } from '../../configurations/constants';

export const dataTypes: Array<{ id: AppDataType; label: string }> = [
  { id: 'synthetics', label: 'Synthetic Monitoring' },
  { id: 'ux', label: 'User Experience (RUM)' },
  // { id: 'infra_logs', label: 'Logs' },
  // { id: 'infra_metrics', label: 'Metrics' },
  // { id: 'apm', label: 'APM' },
];

export function DataTypesCol({ seriesId }: { seriesId: string }) {
  const { series, setSeries, removeSeries } = useUrlStorage(seriesId);

  const { loading } = useAppIndexPatternContext();

  const onDataTypeChange = (dataType?: AppDataType) => {
    if (!dataType) {
      removeSeries(seriesId);
    } else {
      setSeries(seriesId || `${dataType}-series`, { dataType } as any);
    }
  };

  const selectedDataType = series.dataType ?? ReportToDataTypeMap[series.reportType];

  return (
    <FlexGroup direction="column" gutterSize="xs">
      {dataTypes.map(({ id: dataTypeId, label }) => (
        <EuiFlexItem key={dataTypeId}>
          <EuiButton
            size="s"
            iconSide="right"
            iconType="arrowRight"
            color={selectedDataType === dataTypeId ? 'primary' : 'text'}
            fill={selectedDataType === dataTypeId}
            isDisabled={loading}
            isLoading={loading && selectedDataType === dataTypeId}
            onClick={() => {
              onDataTypeChange(dataTypeId);
            }}
          >
            {label}
          </EuiButton>
        </EuiFlexItem>
      ))}
    </FlexGroup>
  );
}

const FlexGroup = styled(EuiFlexGroup)`
  width: 100%;
`;
