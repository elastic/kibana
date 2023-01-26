/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiInMemoryTable } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { isEmpty } from 'lodash/fp';
import { ALERT_SEVERITY } from '@kbn/rule-data-utils';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ShapeTreeNode, ElementClickListener } from '@elastic/charts';
import * as i18n from '../translations';
import type { ParsedSeverityData, SeverityData } from '../types';
import type { FillColor } from '../../../../../common/components/charts/donutchart';
import { DonutChart } from '../../../../../common/components/charts/donutchart';
import { ChartLabel } from '../../../../../overview/components/detection_response/alerts_by_status/chart_label';
import { HeaderSection } from '../../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../../common/components/inspect';
import { getSeverityTableColumns } from '../columns';
import { getSeverityColor } from '../helpers';

const DONUT_HEIGHT = 150;

interface AlertsChartsPanelProps {
  data: ParsedSeverityData;
  isLoading: boolean;
  uniqueQueryId: string;
  addFilter?: ({ field, value }: { field: string; value: string | number }) => void;
}

export const SeverityLevelChart: React.FC<AlertsChartsPanelProps> = ({
  data,
  isLoading,
  uniqueQueryId,
  addFilter,
}) => {
  const fillColor: FillColor = useCallback((d: ShapeTreeNode) => {
    return getSeverityColor(d.dataName);
  }, []);

  const columns = useMemo(() => getSeverityTableColumns(), []);
  const items = data ?? [];

  const count = useMemo(() => {
    return data
      ? data.reduce(function (prev, cur) {
          return prev + cur.value;
        }, 0)
      : 0;
  }, [data]);

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

  return (
    <EuiFlexItem>
      <InspectButtonContainer>
        <EuiPanel>
          <HeaderSection
            id={uniqueQueryId}
            inspectTitle={i18n.SEVERITY_LEVELS_TITLE}
            outerDirection="row"
            title={i18n.SEVERITY_LEVELS_TITLE}
            titleSize="xs"
            hideSubtitle
          />
          <EuiFlexGroup data-test-subj="severty-chart" gutterSize="l">
            <EuiFlexItem>
              <EuiInMemoryTable
                data-test-subj="severity-level-alerts-table"
                columns={columns}
                items={items}
                loading={isLoading}
                sorting={sorting}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <DonutChart
                data-test-subj="severity-level-donut"
                data={data}
                fillColor={fillColor}
                height={DONUT_HEIGHT}
                label={i18n.SEVERITY_TOTAL_ALERTS}
                title={<ChartLabel count={count} />}
                totalCount={count}
                onElementClick={onElementClick}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </InspectButtonContainer>
    </EuiFlexItem>
  );
};

SeverityLevelChart.displayName = 'SeverityLevelChart';
