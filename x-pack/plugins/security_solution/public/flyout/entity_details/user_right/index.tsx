/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FlyoutLoading, FlyoutNavigation } from '@kbn/security-solution-common/src/flyout';
import { buildEntityFlyoutPreviewQuery } from '@kbn/cloud-security-posture-common';
import { useMisconfigurationPreview } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview';
import { useRefetchQueryById } from '../../../entity_analytics/api/hooks/use_refetch_query_by_id';
import type { Refetch } from '../../../common/types';
import { RISK_INPUTS_TAB_QUERY_ID } from '../../../entity_analytics/components/entity_details_flyout/tabs/risk_inputs/risk_inputs_tab';
import { useCalculateEntityRiskScore } from '../../../entity_analytics/api/hooks/use_calculate_entity_risk_score';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { useRiskScore } from '../../../entity_analytics/api/hooks/use_risk_score';
import { ManagedUserDatasetKey } from '../../../../common/search_strategy/security_solution/users/managed_details';
import { useManagedUser } from '../shared/hooks/use_managed_user';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { UsersType } from '../../../explore/users/store/model';
import { getCriteriaFromUsersType } from '../../../common/components/ml/criteria/get_criteria_from_users_type';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { AnomalyTableProvider } from '../../../common/components/ml/anomaly/anomaly_table_provider';
import { buildUserNamesFilter } from '../../../../common/search_strategy';
import { RiskScoreEntity } from '../../../../common/entity_analytics/risk_engine';
import { UserPanelContent } from './content';
import { UserPanelHeader } from './header';
import { UserDetailsPanelKey } from '../user_details_left';
import { useObservedUser } from './hooks/use_observed_user';
import type { EntityDetailsLeftPanelTab } from '../shared/components/left_panel/left_panel_header';
import { UserPreviewPanelFooter } from '../user_preview/footer';

export interface UserPanelProps extends Record<string, unknown> {
  contextID: string;
  scopeId: string;
  userName: string;
  isDraggable?: boolean;
  isPreviewMode?: boolean;
}

export interface UserPanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'user-panel' | 'user-preview-panel';
  params: UserPanelProps;
}

export const UserPanelKey: UserPanelExpandableFlyoutProps['key'] = 'user-panel';
export const UserPreviewPanelKey: UserPanelExpandableFlyoutProps['key'] = 'user-preview-panel';
export const USER_PANEL_RISK_SCORE_QUERY_ID = 'userPanelRiskScoreQuery';
const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

export const UserPanel = ({
  contextID,
  scopeId,
  userName,
  isDraggable,
  isPreviewMode,
}: UserPanelProps) => {
  const { telemetry } = useKibana().services;
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

  const observedUser = useObservedUser(userName, scopeId);
  const email = observedUser.details.user?.email;
  const managedUser = useManagedUser(userName, email, observedUser.isLoading);

  const { data: userRisk } = riskScoreState;
  const userRiskData = userRisk && userRisk.length > 0 ? userRisk[0] : undefined;

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

  const { data } = useMisconfigurationPreview({
    query: buildEntityFlyoutPreviewQuery('user.name', userName),
    sort: [],
    enabled: true,
    pageSize: 1,
    ignore_unavailable: true,
  });

  const passedFindings = data?.count.passed || 0;
  const failedFindings = data?.count.failed || 0;

  const hasMisconfigurationFindings = passedFindings > 0 || failedFindings > 0;

  useQueryInspector({
    deleteQuery,
    inspect,
    loading,
    queryId: USER_PANEL_RISK_SCORE_QUERY_ID,
    refetch,
    setQuery,
  });

  const { openLeftPanel } = useExpandableFlyoutApi();
  const openPanelTab = useCallback(
    (tab?: EntityDetailsLeftPanelTab) => {
      telemetry.reportRiskInputsExpandedFlyoutOpened({
        entity: 'user',
      });

      openLeftPanel({
        id: UserDetailsPanelKey,
        params: {
          isRiskScoreExist: !!userRiskData?.user?.risk,
          scopeId,
          user: {
            name: userName,
            email,
          },
          path: tab ? { tab } : undefined,
          hasMisconfigurationFindings,
        },
      });
    },
    [
      telemetry,
      openLeftPanel,
      userRiskData?.user?.risk,
      scopeId,
      userName,
      email,
      hasMisconfigurationFindings,
    ]
  );

  const openPanelFirstTab = useCallback(() => openPanelTab(), [openPanelTab]);

  const hasUserDetailsData =
    !!userRiskData?.user.risk ||
    !!managedUser.data?.[ManagedUserDatasetKey.OKTA] ||
    !!managedUser.data?.[ManagedUserDatasetKey.ENTRA];

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
            <FlyoutNavigation
              flyoutIsExpandable={
                !isPreviewMode && (hasUserDetailsData || hasMisconfigurationFindings)
              }
              expandDetails={openPanelFirstTab}
            />
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
              openDetailsPanel={!isPreviewMode ? openPanelTab : undefined}
              isPreviewMode={isPreviewMode}
            />
            {isPreviewMode && (
              <UserPreviewPanelFooter
                userName={userName}
                contextID={contextID}
                scopeId={scopeId}
                isDraggable={!!isDraggable}
              />
            )}
          </>
        );
      }}
    </AnomalyTableProvider>
  );
};

UserPanel.displayName = 'UserPanel';
