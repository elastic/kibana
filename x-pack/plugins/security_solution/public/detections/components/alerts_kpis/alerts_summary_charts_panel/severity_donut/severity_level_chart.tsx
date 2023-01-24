/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiInMemoryTable } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { isEmpty } from 'lodash/fp';
import type { Filter } from '@kbn/es-query';
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
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { getAlertsByStatusAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/common/alerts/alerts_by_status_donut';
import { SourcererScopeName } from '../../../../../common/store/sourcerer/model';
import { VisualizationEmbeddable } from '../../../../../common/components/visualization_actions/visualization_embeddable';
import { getAlertsBySeverityTableAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/common/alerts/alerts_by_severity_table';

const DONUT_HEIGHT = 150;

type FieldFilter = ({ field, value }: { field: string; value: string | number }) => void;

interface AlertsChartsPanelProps {
  addFilter?: FieldFilter;
  data: ParsedSeverityData;
  filters?: Filter[];
  isLoading: boolean;
  timerange: { from: string; to: string };
  uniqueQueryId: string;
}

export const SeverityLevelChart: React.FC<AlertsChartsPanelProps> = ({
  addFilter,
  data,
  filters,
  isLoading,
  timerange,
  uniqueQueryId,
}) => {
  const isChartEmbeddablesEnabled = useIsExperimentalFeatureEnabled('chartEmbeddablesEnabled');
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
  const extraOptions = useMemo(() => ({ filters }), [filters]);
  return (
    <EuiFlexItem>
      <InspectButtonContainer>
        <EuiPanel>
          <HeaderSection
            hideSubtitle
            id={uniqueQueryId}
            inspectTitle={i18n.SEVERITY_LEVELS_TITLE}
            outerDirection="row"
            showInspectButton={!isChartEmbeddablesEnabled}
            title={i18n.SEVERITY_LEVELS_TITLE}
            titleSize="xs"
          />
          <EuiFlexGroup data-test-subj="severty-chart" gutterSize="none">
            <EuiFlexItem>
              {isChartEmbeddablesEnabled ? (
                <VisualizationEmbeddable
                  label={i18n.SEVERITY_TOTAL_ALERTS}
                  timerange={timerange}
                  extraOptions={extraOptions}
                  height="135px"
                  getLensAttributes={getAlertsBySeverityTableAttributes}
                  stackByField="kibana.alert.severity"
                  scopeId={SourcererScopeName.detections}
                  id={`${uniqueQueryId}-table`}
                />
              ) : (
                <EuiInMemoryTable
                  data-test-subj="severity-level-alerts-table"
                  columns={columns}
                  items={items}
                  loading={isLoading}
                  sorting={sorting}
                />
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {isChartEmbeddablesEnabled ? (
                <VisualizationEmbeddable
                  applyGlobalQueriesAndFilters={false}
                  extraOptions={extraOptions}
                  getLensAttributes={getAlertsByStatusAttributes}
                  height="135px"
                  id={`${uniqueQueryId}-donut`}
                  isDonut={true}
                  label={i18n.SEVERITY_TOTAL_ALERTS}
                  scopeId={SourcererScopeName.detections}
                  stackByField="kibana.alert.workflow_status"
                  timerange={timerange}
                  width="135px"
                />
              ) : (
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
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </InspectButtonContainer>
    </EuiFlexItem>
  );
};

SeverityLevelChart.displayName = 'SeverityLevelChart';
