/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiBasicTable } from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ShapeTreeNode } from '@elastic/charts';
import * as i18n from './translations';
import type { ParsedAlertsData, SeverityBuckets } from './types';
import type { FillColor } from '../../../../common/components/charts/donutchart';
import { emptyDonutColor } from '../../../../common/components/charts/donutchart_empty';
import { DonutChart } from '../../../../common/components/charts/donutchart';
import { ChartLabel } from '../../../../overview/components/detection_response/alerts_by_status/chart_label';
import { chartConfigs } from '../../../../overview/components/detection_response/alerts_by_status/alerts_by_status';
import { HeaderSection } from '../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../common/components/inspect';
import { getSeverityTableColumns } from './columns';

const DONUT_HEIGHT = 150;

interface AlertsChartsPanelProps {
  data: ParsedAlertsData;
  isLoading: boolean;
  uniqueQueryId: string;
}

export const SeverityLevelChart = memo<AlertsChartsPanelProps>(
  ({ data, isLoading, uniqueQueryId }) => {
    const [sortField, setSortField] = useState<keyof SeverityBuckets>('value');
    const [sortDirection, setSortDirection] = useState<SortOrder>('desc');

    const fillColor: FillColor = useCallback((d: ShapeTreeNode) => {
      return chartConfigs.find((cfg) => cfg.label === d.dataName)?.color ?? emptyDonutColor;
    }, []);

    const onTableChange = useCallback(
      ({ sort = {} }) => {
        setSortField(sort.field);
        setSortDirection(sort.direction);
      },
      [setSortDirection, setSortField]
    );

    const columns = useMemo(() => getSeverityTableColumns(), []);
    const items = data ?? [];

    const count = data
      ? data.reduce(function (prev, cur) {
          return prev + cur.value;
        }, 0)
      : 0;

    const sorting = useMemo(() => {
      return {
        sort: {
          field: sortField,
          direction: sortDirection,
        },
      };
    }, [sortDirection, sortField]);

    return (
      <EuiFlexItem>
        <InspectButtonContainer>
          <EuiPanel>
            <HeaderSection
              id={uniqueQueryId}
              inspectTitle={i18n.SEVERITY_LEVELS_INSPECT_TITLE}
              outerDirection="row"
              title={i18n.SEVERITY_LEVELS_TITLE}
              titleSize="xs"
              hideSubtitle
            />
            <EuiFlexGroup data-test-subj="severtyChart" gutterSize="l">
              <EuiFlexItem>
                <EuiBasicTable
                  data-test-subj="severityLevelAlertsTable"
                  columns={columns}
                  items={items}
                  loading={isLoading}
                  sorting={sorting}
                  onChange={onTableChange}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <DonutChart
                  data={data}
                  fillColor={fillColor}
                  height={DONUT_HEIGHT}
                  label={i18n.SEVERITY_TOTAL_ALERTS}
                  title={<ChartLabel count={count} />}
                  totalCount={count}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </InspectButtonContainer>
      </EuiFlexItem>
    );
  }
);

SeverityLevelChart.displayName = 'SeverityLevelChart';
