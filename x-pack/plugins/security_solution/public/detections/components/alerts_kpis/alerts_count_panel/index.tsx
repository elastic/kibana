/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import React, { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import uuid from 'uuid';

import type { Filter, Query } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { HeaderSection } from '../../../../common/components/header_section';

import { useQueryAlerts } from '../../../containers/detection_engine/alerts/use_query';
import { InspectButtonContainer } from '../../../../common/components/inspect';

import { getAlertsCountQuery } from './helpers';
import * as i18n from './translations';
import { AlertsCount } from './alerts_count';
import type { AlertsCountAggregation } from './types';
import { KpiPanel, StackByComboBox } from '../common/components';
import { useInspectButton } from '../common/hooks';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { ChartOptionsFlexItem } from '../../../pages/detection_engine/chart_context_menu';
import { GROUP_BY_TOP_LABEL, THEN_GROUP_BY_TOP_LABEL } from './translations';

export const DETECTIONS_ALERTS_COUNT_ID = 'detections-alerts-count';

interface AlertsCountPanelProps {
  chartOptionsContextMenu?: React.ReactNode;
  filters?: Filter[];
  query?: Query;
  setStackByField0: (stackBy: string) => void;
  setStackByField1: (stackBy: string | undefined) => void;
  signalIndexName: string | null;
  stackByField0: string;
  stackByField1: string | undefined;
  stackByWidth?: number;
  runtimeMappings?: MappingRuntimeFields;
}

export const AlertsCountPanel = memo<AlertsCountPanelProps>(
  ({
    chartOptionsContextMenu,
    filters,
    query,
    runtimeMappings,
    setStackByField0,
    setStackByField1,
    signalIndexName,
    stackByField0,
    stackByField1,
    stackByWidth,
  }) => {
    const alertsTreemapEnabled = useIsExperimentalFeatureEnabled('alertsTreemapEnabled'); // feature flag
    const { to, from, deleteQuery, setQuery } = useGlobalTime();

    // create a unique, but stable (across re-renders) query id
    const uniqueQueryId = useMemo(() => `${DETECTIONS_ALERTS_COUNT_ID}-${uuid.v4()}`, []);

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
    const [querySkip, setQuerySkip] = useState(!toggleStatus);
    useEffect(() => {
      setQuerySkip(!toggleStatus);
    }, [toggleStatus]);
    const toggleQuery = useCallback(
      (status: boolean) => {
        setToggleStatus(status);
        // toggle on = skipQuery false
        setQuerySkip(!status);
      },
      [setQuerySkip, setToggleStatus]
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
      skip: querySkip,
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
      setQuery,
      response,
      request,
      refetch,
      uniqueQueryId,
      deleteQuery,
      loading: isLoadingAlerts,
    });

    return (
      <InspectButtonContainer show={toggleStatus}>
        <KpiPanel $toggleStatus={toggleStatus} hasBorder data-test-subj="alertsCountPanel">
          <HeaderSection
            id={uniqueQueryId}
            title={i18n.COUNT_TABLE_TITLE}
            titleSize="s"
            hideSubtitle
            toggleStatus={toggleStatus}
            toggleQuery={toggleQuery}
          >
            <EuiFlexGroup alignItems="flexStart" gutterSize="none">
              <EuiFlexItem grow={false}>
                <StackByComboBox
                  prepend={GROUP_BY_TOP_LABEL}
                  selected={stackByField0}
                  onSelect={setStackByField0}
                  width={stackByWidth}
                />
                {alertsTreemapEnabled && (
                  <>
                    <EuiSpacer size="xs" />
                    <StackByComboBox
                      prepend={THEN_GROUP_BY_TOP_LABEL}
                      onSelect={setStackByField1}
                      selected={stackByField1 ?? ''}
                      width={stackByWidth}
                    />
                  </>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {chartOptionsContextMenu != null && (
                  <ChartOptionsFlexItem grow={false}>
                    {chartOptionsContextMenu}
                  </ChartOptionsFlexItem>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </HeaderSection>
          {toggleStatus && alertsData != null && (
            <AlertsCount
              data={alertsData}
              loading={isLoadingAlerts}
              stackByField0={stackByField0}
              stackByField1={stackByField1}
            />
          )}
        </KpiPanel>
      </InspectButtonContainer>
    );
  }
);

AlertsCountPanel.displayName = 'AlertsCountPanel';
