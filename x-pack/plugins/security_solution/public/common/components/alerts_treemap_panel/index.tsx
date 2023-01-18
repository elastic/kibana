/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { EuiComboBox } from '@elastic/eui';
import { EuiProgress } from '@elastic/eui';
import type { Filter, Query } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import React, { useEffect, useMemo } from 'react';
import { v4 as uuid } from 'uuid';

import { useGlobalTime } from '../../containers/use_global_time';
import { AlertsTreemap, DEFAULT_MIN_CHART_HEIGHT } from '../alerts_treemap';
import { KpiPanel } from '../../../detections/components/alerts_kpis/common/components';
import { useInspectButton } from '../../../detections/components/alerts_kpis/common/hooks';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../detections/containers/detection_engine/alerts/constants';
import { FieldSelection } from '../field_selection';
import { HeaderSection } from '../header_section';
import { InspectButtonContainer } from '../inspect';
import { DEFAULT_STACK_BY_FIELD0_SIZE, getAlertsRiskQuery } from '../alerts_treemap/query';
import type { AlertsTreeMapAggregation } from '../alerts_treemap/types';

const DEFAULT_HEIGHT = DEFAULT_MIN_CHART_HEIGHT + 134; // px

const COLLAPSED_HEIGHT = 64; // px

const ALERTS_TREEMAP_ID = 'alerts-treemap';

export interface Props {
  addFilter?: ({ field, value }: { field: string; value: string | number }) => void;
  alignHeader?: 'center' | 'baseline' | 'stretch' | 'flexStart' | 'flexEnd';
  chartOptionsContextMenu?: (queryId: string) => React.ReactNode;
  inspectTitle: string;
  isPanelExpanded: boolean;
  filters?: Filter[];
  height?: number;
  query?: Query;
  riskSubAggregationField: string;
  runtimeMappings?: MappingRuntimeFields;
  setIsPanelExpanded: (value: boolean) => void;
  setStackByField0: (stackBy: string) => void;
  setStackByField0ComboboxInputRef?: (inputRef: HTMLInputElement | null) => void;
  setStackByField1: (stackBy: string | undefined) => void;
  setStackByField1ComboboxInputRef?: (inputRef: HTMLInputElement | null) => void;
  signalIndexName: string | null;
  stackByField0: string;
  stackByField0ComboboxRef?: React.RefObject<EuiComboBox<string | number | string[] | undefined>>;
  stackByField1: string | undefined;
  stackByField1ComboboxRef?: React.RefObject<EuiComboBox<string | number | string[] | undefined>>;
  stackByWidth?: number;
  title: React.ReactNode;
}

const AlertsTreemapPanelComponent: React.FC<Props> = ({
  addFilter,
  alignHeader,
  chartOptionsContextMenu,
  inspectTitle,
  isPanelExpanded,
  filters,
  height = DEFAULT_HEIGHT,
  query,
  riskSubAggregationField,
  runtimeMappings,
  setIsPanelExpanded,
  setStackByField0,
  setStackByField0ComboboxInputRef,
  setStackByField1,
  setStackByField1ComboboxInputRef,
  signalIndexName,
  stackByField0,
  stackByField0ComboboxRef,
  stackByField1,
  stackByField1ComboboxRef,
  stackByWidth,
  title,
}: Props) => {
  const { to, from, deleteQuery, setQuery } = useGlobalTime(false);

  // create a unique, but stable (across re-renders) query id
  const uniqueQueryId = useMemo(() => `${ALERTS_TREEMAP_ID}-${uuid()}`, []);

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
    skip: !isPanelExpanded,
    indexName: signalIndexName,
    queryName: ALERTS_QUERY_NAMES.TREE_MAP,
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
        className="eui-yScroll"
        data-test-subj="treemapPanel"
        hasBorder
        height={isPanelExpanded ? height : COLLAPSED_HEIGHT}
        $overflowY={isPanelExpanded ? 'auto' : 'hidden'}
        $toggleStatus
      >
        <HeaderSection
          alignHeader={alignHeader}
          hideSubtitle
          id={uniqueQueryId}
          inspectTitle={inspectTitle}
          outerDirection="row"
          showInspectButton={chartOptionsContextMenu == null}
          title={title}
          titleSize="s"
          toggleQuery={setIsPanelExpanded}
          toggleStatus={isPanelExpanded}
        >
          {isPanelExpanded && (
            <FieldSelection
              chartOptionsContextMenu={chartOptionsContextMenu}
              setStackByField0={setStackByField0}
              setStackByField0ComboboxInputRef={setStackByField0ComboboxInputRef}
              setStackByField1={setStackByField1}
              setStackByField1ComboboxInputRef={setStackByField1ComboboxInputRef}
              stackByField0={stackByField0}
              stackByField0ComboboxRef={stackByField0ComboboxRef}
              stackByField1={stackByField1}
              stackByField1ComboboxRef={stackByField1ComboboxRef}
              stackByWidth={stackByWidth}
              uniqueQueryId={uniqueQueryId}
            />
          )}
        </HeaderSection>

        {isLoadingAlerts && isPanelExpanded ? (
          <EuiProgress color="accent" data-test-subj="progress" position="absolute" size="xs" />
        ) : (
          <>
            {alertsData != null && isPanelExpanded && (
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
