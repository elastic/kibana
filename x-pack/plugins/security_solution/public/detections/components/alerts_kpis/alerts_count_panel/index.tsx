/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProgress } from '@elastic/eui';
import type { EuiComboBox } from '@elastic/eui';
import type { Action } from '@kbn/ui-actions-plugin/public';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import React, { memo, useMemo, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

import type { Filter, Query } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { HeaderSection } from '../../../../common/components/header_section';

import { useQueryAlerts } from '../../../containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../containers/detection_engine/alerts/constants';
import { InspectButtonContainer } from '../../../../common/components/inspect';

import { getAlertsCountQuery } from './helpers';
import * as i18n from './translations';
import type { AlertsCountAggregation } from './types';
import { KpiPanel } from '../common/components';
import { useInspectButton } from '../common/hooks';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { FieldSelection } from '../../../../common/components/field_selection';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { getAlertsTableLensAttributes as getLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/common/alerts/alerts_table';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { ChartContent } from './chart_content';

export const DETECTIONS_ALERTS_COUNT_ID = 'detections-alerts-count';

interface AlertsCountPanelProps {
  alignHeader?: 'center' | 'baseline' | 'stretch' | 'flexStart' | 'flexEnd';
  chartOptionsContextMenu?: (queryId: string) => React.ReactNode;
  extraActions?: Action[];
  filters?: Filter[];
  inspectTitle: string;
  panelHeight?: number;
  query?: Query;
  runtimeMappings?: MappingRuntimeFields;
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
  title?: React.ReactNode;
  isExpanded?: boolean;
  setIsExpanded?: (status: boolean) => void;
}
const CHART_HEIGHT = '100%';

export const AlertsCountPanel = memo<AlertsCountPanelProps>(
  ({
    alignHeader,
    chartOptionsContextMenu,
    extraActions,
    filters,
    inspectTitle,
    panelHeight,
    query,
    runtimeMappings,
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
    title = i18n.COUNT_TABLE_TITLE,
    isExpanded,
    setIsExpanded,
  }) => {
    const { to, from, deleteQuery, setQuery } = useGlobalTime(false);
    const isChartEmbeddablesEnabled = useIsExperimentalFeatureEnabled('chartEmbeddablesEnabled');
    const isAlertsPageChartsEnabled = useIsExperimentalFeatureEnabled('alertsPageChartsEnabled');
    // create a unique, but stable (across re-renders) query id
    const uniqueQueryId = useMemo(() => `${DETECTIONS_ALERTS_COUNT_ID}-${uuidv4()}`, []);

    // Disabling the fecth method in useQueryAlerts since it is defaulted to the old one
    // const fetchMethod = fetchQueryRuleRegistryAlerts;

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

    const { toggleStatus, setToggleStatus } = useQueryToggle(DETECTIONS_ALERTS_COUNT_ID);
    const toggleQuery = useCallback(
      (newToggleStatus: boolean) => {
        if (isAlertsPageChartsEnabled && setIsExpanded) {
          setIsExpanded(newToggleStatus);
        } else {
          setToggleStatus(newToggleStatus);
        }
      },
      [setToggleStatus, setIsExpanded, isAlertsPageChartsEnabled]
    );

    const querySkip = useMemo(
      () => (isAlertsPageChartsEnabled ? !isExpanded : !toggleStatus),
      [isAlertsPageChartsEnabled, isExpanded, toggleStatus]
    );

    const timerange = useMemo(() => ({ from, to }), [from, to]);

    const extraVisualizationOptions = useMemo(
      () => ({
        breakdownField: stackByField1,
        filters,
      }),
      [filters, stackByField1]
    );
    const {
      loading: isLoadingAlerts,
      data: alertsData,
      setQuery: setAlertsQuery,
      response,
      request,
      refetch,
    } = useQueryAlerts<{}, AlertsCountAggregation>({
      query: getAlertsCountQuery({
        stackByField0,
        stackByField1,
        from,
        to,
        additionalFilters,
        runtimeMappings,
      }),
      indexName: signalIndexName,
      skip: querySkip || isChartEmbeddablesEnabled,
      queryName: ALERTS_QUERY_NAMES.COUNT,
    });

    useEffect(() => {
      setAlertsQuery(
        getAlertsCountQuery({
          additionalFilters,
          from,
          runtimeMappings,
          stackByField0,
          stackByField1,
          to,
        })
      );
    }, [
      additionalFilters,
      from,
      runtimeMappings,
      setAlertsQuery,
      stackByField0,
      stackByField1,
      to,
    ]);

    useInspectButton({
      deleteQuery,
      loading: isLoadingAlerts,
      refetch,
      request,
      response,
      setQuery,
      uniqueQueryId,
    });
    const showCount = useMemo(() => {
      if (isAlertsPageChartsEnabled) {
        return isExpanded;
      }
      return toggleStatus;
    }, [isAlertsPageChartsEnabled, toggleStatus, isExpanded]);

    return (
      <InspectButtonContainer show={isAlertsPageChartsEnabled ? isExpanded : toggleStatus}>
        <KpiPanel
          $toggleStatus={
            isAlertsPageChartsEnabled && isExpanded !== undefined ? isExpanded : toggleStatus
          }
          data-test-subj="alertsCountPanel"
          hasBorder
          height={panelHeight}
        >
          <HeaderSection
            alignHeader={alignHeader}
            id={uniqueQueryId}
            inspectTitle={inspectTitle}
            outerDirection="row"
            title={title}
            titleSize="s"
            hideSubtitle
            showInspectButton={chartOptionsContextMenu == null}
            toggleStatus={isAlertsPageChartsEnabled ? isExpanded : toggleStatus}
            toggleQuery={toggleQuery}
          >
            <FieldSelection
              chartOptionsContextMenu={
                isChartEmbeddablesEnabled ? undefined : chartOptionsContextMenu
              }
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
              useLensCompatibleFields={isChartEmbeddablesEnabled}
            />
          </HeaderSection>
          {showCount &&
            (isLoadingAlerts ? (
              <EuiProgress color="accent" data-test-subj="progress" position="absolute" size="xs" />
            ) : (
              <ChartContent
                alertsData={alertsData}
                data-test-subj="embeddable-count-table"
                extraActions={extraActions}
                extraOptions={extraVisualizationOptions}
                getLensAttributes={getLensAttributes}
                height={CHART_HEIGHT}
                id={`${uniqueQueryId}-embeddable`}
                inspectTitle={inspectTitle}
                isChartEmbeddablesEnabled={isChartEmbeddablesEnabled}
                isLoadingAlerts={isLoadingAlerts}
                scopeId={SourcererScopeName.detections}
                stackByField0={stackByField0}
                stackByField1={stackByField1}
                stackByField={stackByField0}
                timerange={timerange}
              />
            ))}
        </KpiPanel>
      </InspectButtonContainer>
    );
  }
);

AlertsCountPanel.displayName = 'AlertsCountPanel';
