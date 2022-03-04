/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiSpacer } from '@elastic/eui';
import type { Filter, Query } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import React, { useEffect, useMemo } from 'react';
import uuid from 'uuid';

import { useGlobalTime } from '../../containers/use_global_time';
import { AlertsTreemap, DEFAULT_MIN_CHART_HEIGHT } from './component';
import {
  KpiPanel,
  StackByComboBox,
} from '../../../detections/components/alerts_kpis/common/components';
import { useInspectButton } from '../../../detections/components/alerts_kpis/common/hooks';
import {
  GROUP_BY_TOP_LABEL,
  THEN_GROUP_BY_TOP_LABEL,
} from '../../../detections/components/alerts_kpis/common/translations';
import { AlertSearchResponse } from '../../../detections/containers/detection_engine/alerts/types';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { ChartOptionsFlexItem } from '../../../detections/pages/detection_engine/chart_context_menu';
import { HeaderSection } from '../header_section';
import { InspectButtonContainer } from '../inspect';
import { DEFAULT_STACK_BY_FIELD0_SIZE, getAlertsRiskQuery } from './query';
import * as i18n from './translations';
import type { AlertsTreeMapAggregation } from './types';

const DEFAULT_HEIGHT = DEFAULT_MIN_CHART_HEIGHT + 122; // px

const COLLAPSED_HEIGHT = 64; // px

const ALERTS_TREEMAP_ID = 'alerts-treemap';

interface AlertsTreemapPanelProps {
  addFilter?: ({ field, value }: { field: string; value: string | number }) => void;
  chartOptionsContextMenu?: React.ReactNode;
  expandRiskChart: boolean;
  filters?: Filter[];
  height?: number;
  query?: Query;
  riskSubAggregationField: string;
  runtimeMappings?: MappingRuntimeFields;
  setExpandRiskChart: (value: boolean) => void;
  setStackByField0: (stackBy: string) => void;
  setStackByField1: (stackBy: string | undefined) => void;
  signalIndexName: string | null;
  stackByField0: string;
  stackByField1: string | undefined;
  stackByWidth?: number;
}

export const getBucketsCount = (
  data: AlertSearchResponse<unknown, AlertsTreeMapAggregation> | null
): number => data?.aggregations?.stackByField0?.buckets?.length ?? 0;

const AlertsTreemapPanelComponent = ({
  addFilter,
  chartOptionsContextMenu,
  expandRiskChart,
  filters,
  height = DEFAULT_HEIGHT,
  query,
  riskSubAggregationField,
  runtimeMappings,
  setExpandRiskChart,
  setStackByField0,
  setStackByField1,
  signalIndexName,
  stackByField0,
  stackByField1,
  stackByWidth,
}: AlertsTreemapPanelProps) => {
  const { to, from, deleteQuery, setQuery } = useGlobalTime();

  // create a unique, but stable (across re-renders) query id
  const uniqueQueryId = useMemo(() => `${ALERTS_TREEMAP_ID}-${uuid.v4()}`, []);

  const additionalFilters = useMemo(() => {
    try {
      return [
        buildEsQuery(
          undefined,
          query != null ? [query] : [],
          filters?.filter((f) => f.meta.disabled === false) ?? []
        ),
      ];
    } catch (e) {
      return [];
    }
  }, [query, filters]);

  const {
    data: alertsData,
    loading: isLoadingAlerts,
    refetch,
    request,
    response,
    setQuery: setAlertsQuery,
  } = useQueryAlerts<{}, AlertsTreeMapAggregation>({
    query: getAlertsRiskQuery({
      additionalFilters,
      from,
      riskSubAggregationField,
      runtimeMappings,
      stackByField0,
      stackByField1,
      to,
    }),
    skip: !expandRiskChart,
    indexName: signalIndexName,
  });

  useEffect(() => {
    setAlertsQuery(
      getAlertsRiskQuery({
        additionalFilters,
        from,
        riskSubAggregationField,
        runtimeMappings,
        stackByField0,
        stackByField1,
        to,
      })
    );
  }, [
    additionalFilters,
    from,
    riskSubAggregationField,
    runtimeMappings,
    setAlertsQuery,
    stackByField0,
    stackByField1,
    to,
  ]);

  useInspectButton({
    deleteQuery,
    loading: isLoadingAlerts,
    response,
    setQuery,
    refetch,
    request,
    uniqueQueryId,
  });

  return (
    <InspectButtonContainer>
      <KpiPanel
        hasBorder
        height={expandRiskChart ? height : COLLAPSED_HEIGHT}
        data-test-subj="treemapPanel"
        $toggleStatus={true}
      >
        <HeaderSection
          hideSubtitle={true}
          id={uniqueQueryId}
          title={i18n.ALERTS_BY_RISK_SCORE_TITLE}
          titleSize="s"
          toggleStatus={expandRiskChart}
          toggleQuery={setExpandRiskChart}
        >
          {expandRiskChart && (
            <EuiFlexGroup alignItems="flexStart" gutterSize="none">
              <EuiFlexItem grow={false}>
                <StackByComboBox
                  onSelect={setStackByField0}
                  prepend={GROUP_BY_TOP_LABEL}
                  selected={stackByField0}
                  width={stackByWidth}
                />
                <EuiSpacer size="xs" />
                <StackByComboBox
                  onSelect={setStackByField1}
                  prepend={THEN_GROUP_BY_TOP_LABEL}
                  selected={stackByField1 ?? ''}
                  width={stackByWidth}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {chartOptionsContextMenu != null && (
                  <ChartOptionsFlexItem grow={false}>
                    {chartOptionsContextMenu}
                  </ChartOptionsFlexItem>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </HeaderSection>

        {isLoadingAlerts ? (
          <EuiProgress size="xs" position="absolute" color="accent" />
        ) : (
          <>
            {alertsData != null && expandRiskChart && (
              <AlertsTreemap
                addFilter={addFilter}
                data={alertsData}
                maxBuckets={DEFAULT_STACK_BY_FIELD0_SIZE}
                stackByField0={stackByField0}
                stackByField1={stackByField1}
              />
            )}
          </>
        )}
      </KpiPanel>
    </InspectButtonContainer>
  );
};

AlertsTreemapPanelComponent.displayName = 'AlertsTreemapPanelComponent';

export const AlertsTreemapPanel = React.memo(AlertsTreemapPanelComponent);
