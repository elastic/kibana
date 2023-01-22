/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { isEmpty } from 'lodash/fp';
import { ALERT_SEVERITY } from '@kbn/rule-data-utils';
import { EuiFlexGroup, EuiFlexItem, EuiInMemoryTable, EuiLoadingSpinner } from '@elastic/eui';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ShapeTreeNode, ElementClickListener } from '@elastic/charts';
import type { SeverityBuckets as SeverityData } from '../../../../overview/components/detection_response/alerts_by_status/types';
import type { FillColor } from '../../../../common/components/charts/donutchart';
import type { SummaryChartsData } from '../alerts_summary_charts_panel/types';
import { DonutChart } from '../../../../common/components/charts/donutchart';
import { ChartLabel } from '../../../../overview/components/detection_response/alerts_by_status/chart_label';
import { getSeverityTableColumns } from './columns';
import { getSeverityColor } from './helpers';
import { TOTAL_COUNT_OF_ALERTS } from '../../alerts_table/translations';
import { showInitialLoadingSpinner } from '../alerts_histogram_panel/helpers';

const DONUT_HEIGHT = 150;

export interface SeverityLevelProps {
  items: SummaryChartsData[] | null;
  isLoading: boolean;
  addFilter?: ({ field, value }: { field: string; value: string | number }) => void;
}

export const SeverityLevelChart: React.FC<SeverityLevelProps> = ({
  items,
  isLoading,
  addFilter,
}) => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const columns = useMemo(() => getSeverityTableColumns(), []);
  const data = useMemo(() => (items as SeverityData[]) ?? [], [items]);
  const count = useMemo(() => {
    return data
      ? data.reduce(function (prev, cur) {
          return prev + cur.value;
        }, 0)
      : 0;
  }, [data]);

  const fillColor: FillColor = useCallback((d: ShapeTreeNode) => {
    return getSeverityColor(d.dataName);
  }, []);

  const sorting: { sort: { field: keyof SeverityData; direction: SortOrder } } = {
    sort: {
      field: 'value',
      direction: 'desc',
    },
  };

  const onElementClick: ElementClickListener = useCallback(
    (event) => {
      const flattened = event.flat(2);
      const level =
        flattened.length > 0 &&
        'groupByRollup' in flattened[0] &&
        flattened[0].groupByRollup != null
          ? `${flattened[0].groupByRollup}`
          : '';

      if (addFilter != null && !isEmpty(level.trim())) {
        addFilter({ field: ALERT_SEVERITY, value: level.toLowerCase() });
      }
    },
    [addFilter]
  );

  useEffect(() => {
    if (!showInitialLoadingSpinner({ isInitialLoading, isLoadingAlerts: isLoading })) {
      setIsInitialLoading(false);
    }
  }, [isInitialLoading, isLoading, setIsInitialLoading]);

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
        {isInitialLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : (
          <DonutChart
            data={data}
            fillColor={fillColor}
            height={DONUT_HEIGHT}
            label={TOTAL_COUNT_OF_ALERTS}
            title={<ChartLabel count={count} />}
            totalCount={count}
            onElementClick={onElementClick}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

SeverityLevelChart.displayName = 'SeverityLevelChart';
