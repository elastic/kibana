/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { useRefetchQueryById } from '../../../entity_analytics/api/hooks/use_refetch_query_by_id';
import type { Refetch } from '../../../common/types';
import { RISK_INPUTS_TAB_QUERY_ID } from '../../../entity_analytics/components/entity_details_flyout/tabs/risk_inputs/risk_inputs_tab';
import { useCalculateEntityRiskScore } from '../../../entity_analytics/api/hooks/use_calculate_entity_risk_score';
import { useRiskScore } from '../../../entity_analytics/api/hooks/use_risk_score';
import { useManagedUser } from '../../../timelines/components/side_panel/new_user_detail/hooks/use_managed_user';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { UsersType } from '../../../explore/users/store/model';
import { getCriteriaFromUsersType } from '../../../common/components/ml/criteria/get_criteria_from_users_type';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { AnomalyTableProvider } from '../../../common/components/ml/anomaly/anomaly_table_provider';
import { buildUserNamesFilter } from '../../../../common/search_strategy';
import { RiskScoreEntity } from '../../../../common/entity_analytics/risk_engine';
import { FlyoutLoading } from '../../shared/components/flyout_loading';
import { UserPanelContent } from '../user_right/content';
import { UserPanelHeader } from '../user_right/header';
import { useObservedUser } from '../user_right/hooks/use_observed_user';
import { UserPreviewPanelFooter } from './footer';

export interface UserPreviewPanelProps extends Record<string, unknown> {
  contextID: string;
  scopeId: string;
  userName: string;
  isDraggable?: boolean;
}

export interface UserPreviewPanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'user-preview-panel';
  params: UserPreviewPanelProps;
}

export const UserPreviewPanelKey: UserPreviewPanelExpandableFlyoutProps['key'] =
  'user-preview-panel';
export const USER_PREVIEW_PANEL_RISK_SCORE_QUERY_ID = 'userPreviewPanelRiskScoreQuery';
const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

export const UserPreviewPanel = ({
  contextID,
  scopeId,
  userName,
  isDraggable,
}: UserPreviewPanelProps) => {
  const userNameFilterQuery = useMemo(
    () => (userName ? buildUserNamesFilter([userName]) : undefined),
    [userName]
  );

  const riskScoreState = useRiskScore({
    riskEntity: RiskScoreEntity.user,
    filterQuery: userNameFilterQuery,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
  });

  const { inspect, refetch, loading } = riskScoreState;
  const { to, from, isInitializing, setQuery, deleteQuery } = useGlobalTime();

  // do not pass scopeId as related users may not be in the alert index
  const observedUser = useObservedUser(userName, '');
  const email = observedUser.details.user?.email;
  const managedUser = useManagedUser(userName, email, observedUser.isLoading);

  const refetchRiskInputsTab = useRefetchQueryById(RISK_INPUTS_TAB_QUERY_ID);
  const refetchRiskScore = useCallback(() => {
    refetch();
    (refetchRiskInputsTab as Refetch | null)?.();
  }, [refetch, refetchRiskInputsTab]);

  const { isLoading: recalculatingScore, calculateEntityRiskScore } = useCalculateEntityRiskScore(
    RiskScoreEntity.user,
    userName,
    { onSuccess: refetchRiskScore }
  );

  useQueryInspector({
    deleteQuery,
    inspect,
    loading,
    queryId: USER_PREVIEW_PANEL_RISK_SCORE_QUERY_ID,
    refetch,
    setQuery,
  });

  if (observedUser.isLoading || managedUser.isLoading) {
    return <FlyoutLoading />;
  }

  return (
    <AnomalyTableProvider
      criteriaFields={getCriteriaFromUsersType(UsersType.details, userName)}
      startDate={from}
      endDate={to}
      skip={isInitializing}
    >
      {({ isLoadingAnomaliesData, anomaliesData, jobNameById }) => {
        const observedUserWithAnomalies = {
          ...observedUser,
          anomalies: {
            isLoading: isLoadingAnomaliesData,
            anomalies: anomaliesData,
            jobNameById,
          },
        };
        return (
          <>
            <UserPanelHeader
              userName={userName}
              observedUser={observedUserWithAnomalies}
              managedUser={managedUser}
            />
            <UserPanelContent
              userName={userName}
              managedUser={managedUser}
              observedUser={observedUserWithAnomalies}
              riskScoreState={riskScoreState}
              recalculatingScore={recalculatingScore}
              onAssetCriticalityChange={calculateEntityRiskScore}
              contextID={contextID}
              scopeId={scopeId}
              isDraggable={!!isDraggable}
            />
            <UserPreviewPanelFooter
              userName={userName}
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

UserPreviewPanel.displayName = 'UserPreviewPanel';
