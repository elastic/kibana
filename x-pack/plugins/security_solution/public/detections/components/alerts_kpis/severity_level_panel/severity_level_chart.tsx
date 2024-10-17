/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { ALERT_SEVERITY } from '@kbn/rule-data-utils';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiInMemoryTable, EuiLoadingSpinner } from '@elastic/eui';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SeverityBuckets as SeverityData } from '../../../../overview/components/detection_response/alerts_by_status/types';
import type { FillColor } from '../../../../common/components/charts/donutchart';
import { DonutChart } from '../../../../common/components/charts/donutchart';
import { ChartLabel } from '../../../../overview/components/detection_response/alerts_by_status/chart_label';
import { getSeverityTableColumns } from './columns';
import { getSeverityColor } from './helpers';
import { TOTAL_COUNT_OF_ALERTS } from '../../alerts_table/translations';

const DONUT_HEIGHT = 150;

const StyledEuiLoadingSpinner = styled(EuiLoadingSpinner)`
  margin: auto;
`;
export interface SeverityLevelProps {
  data: SeverityData[];
  isLoading: boolean;
  addFilter?: ({ field, value }: { field: string; value: string | number }) => void;
}

export const SeverityLevelChart: React.FC<SeverityLevelProps> = ({
  data,
  isLoading,
  addFilter,
}) => {
  const columns = useMemo(() => getSeverityTableColumns(), []);

  const count = useMemo(() => {
    return data
      ? data.reduce(function (prev, cur) {
          return prev + cur.value;
        }, 0)
      : 0;
  }, [data]);

  const fillColor: FillColor = useCallback((dataName: string) => {
    return getSeverityColor(dataName);
  }, []);

  const sorting: { sort: { field: keyof SeverityData; direction: SortOrder } } = {
    sort: {
      field: 'value',
      direction: 'desc',
    },
  };

  const onDonutPartitionClicked = useCallback(
    (level: string) => {
      if (addFilter) {
        addFilter({ field: ALERT_SEVERITY, value: level.toLowerCase() });
      }
    },
    [addFilter]
  );

  return (
    <EuiFlexGroup gutterSize="s" data-test-subj="severity-level-chart">
      <EuiFlexItem>
        <EuiInMemoryTable
          data-test-subj="severity-level-table"
          columns={columns}
          items={data}
          loading={isLoading}
          sorting={sorting}
        />
      </EuiFlexItem>
      <EuiFlexItem data-test-subj="severity-level-donut">
        {isLoading ? (
          <StyledEuiLoadingSpinner size="l" />
        ) : (
          <DonutChart
            data={data}
            fillColor={fillColor}
            height={DONUT_HEIGHT}
            label={TOTAL_COUNT_OF_ALERTS}
            title={<ChartLabel count={count} />}
            totalCount={count}
            onPartitionClick={onDonutPartitionClicked}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

SeverityLevelChart.displayName = 'SeverityLevelChart';
