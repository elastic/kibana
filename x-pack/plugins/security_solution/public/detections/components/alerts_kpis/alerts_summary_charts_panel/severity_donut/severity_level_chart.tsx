/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiInMemoryTable,
  EuiLoadingSpinner,
} from '@elastic/eui';
import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { isEmpty } from 'lodash/fp';
import uuid from 'uuid';
import { ALERT_SEVERITY } from '@kbn/rule-data-utils';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ShapeTreeNode, ElementClickListener } from '@elastic/charts';
import type { ChartsPanelProps } from '../types';
import type { SeverityBuckets as SeverityData } from '../../../../../overview/components/detection_response/alerts_by_status/types';
import type { FillColor } from '../../../../../common/components/charts/donutchart';
import { DonutChart } from '../../../../../common/components/charts/donutchart';
import { ChartLabel } from '../../../../../overview/components/detection_response/alerts_by_status/chart_label';
import { HeaderSection } from '../../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../../common/components/inspect';
import { getSeverityTableColumns } from '../columns';
import { getSeverityColor } from '../helpers';
import { TOTAL_COUNT_OF_ALERTS } from '../../../alerts_table/translations';
import { showInitialLoadingSpinner } from '../../alerts_histogram_panel/helpers';
import { useSummaryChartData } from '../use_summary_chart_data';
import { severityAggregations } from '../use_summary_chart_data/aggregations';
import * as i18n from '../translations';

const DONUT_HEIGHT = 150;
const SEVERITY_DONUT_CHART_ID = 'alerts-summary-severity-donut';

export const SeverityLevelChart: React.FC<ChartsPanelProps> = ({
  filters,
  query,
  signalIndexName,
  runtimeMappings,
  addFilter,
  skip,
}) => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const uniqueQueryId = useMemo(() => `${SEVERITY_DONUT_CHART_ID}-${uuid.v4()}`, []);
  const columns = useMemo(() => getSeverityTableColumns(), []);

  const { items, isLoading } = useSummaryChartData({
    aggregationType: 'Severity',
    aggregations: severityAggregations,
    filters,
    query,
    signalIndexName,
    runtimeMappings,
    skip,
    uniqueQueryId,
  });

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
    <InspectButtonContainer>
      <EuiPanel hasBorder hasShadow={false} data-test-subj="severty-level-chart">
        <HeaderSection
          id={uniqueQueryId}
          inspectTitle={i18n.SEVERITY_LEVELS_TITLE}
          outerDirection="row"
          title={i18n.SEVERITY_LEVELS_TITLE}
          titleSize="xs"
          hideSubtitle
        />
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiInMemoryTable
              data-test-subj="severity-level-table"
              columns={columns}
              items={data}
              loading={isLoading}
              sorting={sorting}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            {isInitialLoading ? (
              <EuiLoadingSpinner size="l" />
            ) : (
              <DonutChart
                data-test-subj="severity-level-donut"
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
      </EuiPanel>
    </InspectButtonContainer>
  );
};

SeverityLevelChart.displayName = 'SeverityLevelChart';
