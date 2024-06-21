/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { useRefetchQueryById } from '../../../entity_analytics/api/hooks/use_refetch_query_by_id';
import { RISK_INPUTS_TAB_QUERY_ID } from '../../../entity_analytics/components/entity_details_flyout/tabs/risk_inputs/risk_inputs_tab';
import type { Refetch } from '../../../common/types';
import { useCalculateEntityRiskScore } from '../../../entity_analytics/api/hooks/use_calculate_entity_risk_score';
import { hostToCriteria } from '../../../common/components/ml/criteria/host_to_criteria';
import { useRiskScore } from '../../../entity_analytics/api/hooks/use_risk_score';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import type { HostItem } from '../../../../common/search_strategy';
import { buildHostNamesFilter } from '../../../../common/search_strategy';
import { RiskScoreEntity } from '../../../../common/entity_analytics/risk_engine';
import { FlyoutLoading } from '../../shared/components/flyout_loading';
import { HostPanelContent } from '../host_right/content';
import { HostPanelHeader } from '../host_right/header';
import { AnomalyTableProvider } from '../../../common/components/ml/anomaly/anomaly_table_provider';
import type { ObservedEntityData } from '../shared/components/observed_entity/types';
import { useObservedHost } from '../host_right/hooks/use_observed_host';
import { HostPreviewPanelFooter } from './footer';

export interface HostPreviewPanelProps extends Record<string, unknown> {
  contextID: string;
  scopeId: string;
  hostName: string;
  isDraggable?: boolean;
}

export interface HostPreviewPanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'host-preview-panel';
  params: HostPreviewPanelProps;
}

export const HostPreviewPanelKey: HostPreviewPanelExpandableFlyoutProps['key'] =
  'host-preview-panel';
export const HOST_PREVIEW_PANEL_RISK_SCORE_QUERY_ID = 'HostPreviewPanelRiskScoreQuery';
export const HOST_PREVIEW_PANEL_OBSERVED_HOST_QUERY_ID = 'HostPreviewPanelObservedHostQuery';

const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

export const HostPreviewPanel = ({
  contextID,
  scopeId,
  hostName,
  isDraggable,
}: HostPreviewPanelProps) => {
  const { to, from, isInitializing, setQuery, deleteQuery } = useGlobalTime();
  const hostNameFilterQuery = useMemo(
    () => (hostName ? buildHostNamesFilter([hostName]) : undefined),
    [hostName]
  );

  const riskScoreState = useRiskScore({
    riskEntity: RiskScoreEntity.host,
    filterQuery: hostNameFilterQuery,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
  });

  const { inspect: inspectRiskScore, refetch, loading } = riskScoreState;

  const refetchRiskInputsTab = useRefetchQueryById(RISK_INPUTS_TAB_QUERY_ID);
  const refetchRiskScore = useCallback(() => {
    refetch();
    (refetchRiskInputsTab as Refetch | null)?.();
  }, [refetch, refetchRiskInputsTab]);

  const { isLoading: recalculatingScore, calculateEntityRiskScore } = useCalculateEntityRiskScore(
    RiskScoreEntity.host,
    hostName,
    { onSuccess: refetchRiskScore }
  );

  useQueryInspector({
    deleteQuery,
    inspect: inspectRiskScore,
    loading,
    queryId: HOST_PREVIEW_PANEL_RISK_SCORE_QUERY_ID,
    refetch,
    setQuery,
  });

  // do not pass scopeId as related hosts may not be in the alert index
  const observedHost = useObservedHost(hostName, '');

  if (observedHost.isLoading) {
    return <FlyoutLoading />;
  }

  return (
    <AnomalyTableProvider
      criteriaFields={hostToCriteria(observedHost.details)}
      startDate={from}
      endDate={to}
      skip={isInitializing}
    >
      {({ isLoadingAnomaliesData, anomaliesData, jobNameById }) => {
        const observedHostWithAnomalies: ObservedEntityData<HostItem> = {
          ...observedHost,
          anomalies: {
            isLoading: isLoadingAnomaliesData,
            anomalies: anomaliesData,
            jobNameById,
          },
        };

        return (
          <>
            <HostPanelHeader hostName={hostName} observedHost={observedHostWithAnomalies} />
            <HostPanelContent
              hostName={hostName}
              observedHost={observedHostWithAnomalies}
              riskScoreState={riskScoreState}
              contextID={contextID}
              scopeId={scopeId}
              isDraggable={!!isDraggable}
              recalculatingScore={recalculatingScore}
              onAssetCriticalityChange={calculateEntityRiskScore}
            />
            <HostPreviewPanelFooter
              hostName={hostName}
              contextID={contextID}
              scopeId={scopeId}
              isDraggable={!!isDraggable}
            />
          </>
        );
      }}
    </AnomalyTableProvider>
  );
};

HostPreviewPanel.displayName = 'HostPanel';
