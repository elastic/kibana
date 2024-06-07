/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useRefetchQueryById } from '../../../entity_analytics/api/hooks/use_refetch_query_by_id';
import type { Refetch } from '../../../common/types';
import { RISK_INPUTS_TAB_QUERY_ID } from '../../../entity_analytics/components/entity_details_flyout/tabs/risk_inputs/risk_inputs_tab';
import { useCalculateEntityRiskScore } from '../../../entity_analytics/api/hooks/use_calculate_entity_risk_score';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { useRiskScore } from '../../../entity_analytics/api/hooks/use_risk_score';
import { ManagedUserDatasetKey } from '../../../../common/search_strategy/security_solution/users/managed_details';
import { useManagedUser } from '../../../timelines/components/side_panel/new_user_detail/hooks/use_managed_user';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { UsersType } from '../../../explore/users/store/model';
import { getCriteriaFromUsersType } from '../../../common/components/ml/criteria/get_criteria_from_users_type';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { AnomalyTableProvider } from '../../../common/components/ml/anomaly/anomaly_table_provider';
import { buildUserNamesFilter } from '../../../../common/search_strategy';
import { RiskScoreEntity } from '../../../../common/entity_analytics/risk_engine';
import { FlyoutLoading } from '../../shared/components/flyout_loading';
import { PreviewNavigation } from '../../shared/components/preview_navigation';
import { UserPreviewPanelContent } from './content';
import { UserPreviewPanelHeader } from './header';
import { UserPanelKey } from '../user_right';
import { UserDetailsPanelKey } from '../user_details_left';
import { useObservedUser } from '../user_right/hooks/use_observed_user';
import type { EntityDetailsLeftPanelTab } from '../shared/components/left_panel/left_panel_header';

export interface UserPreviewPanelProps extends Record<string, unknown> {
  contextID?: string;
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
export const USER_PANEL_RISK_SCORE_QUERY_ID = 'userPanelRiskScoreQuery';
const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

export const UserPreviewPanel = ({
  contextID = 'context',
  scopeId,
  userName,
  isDraggable,
}: UserPreviewPanelProps) => {
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

  useQueryInspector({
    deleteQuery,
    inspect,
    loading,
    queryId: USER_PANEL_RISK_SCORE_QUERY_ID,
    refetch,
    setQuery,
  });

  const { openFlyout } = useExpandableFlyoutApi();
  const openPanelTab = useCallback(
    (tab?: EntityDetailsLeftPanelTab) => {
      telemetry.reportRiskInputsExpandedFlyoutOpened({
        entity: 'user',
      });
      openFlyout({
        right: {
          id: UserPanelKey,
          params: {
            userName,
            scopeId,
          },
        },
        left: {
          id: UserDetailsPanelKey,
          params: {
            isRiskScoreExist: !!userRiskData?.user?.risk,
            user: {
              name: userName,
              email,
            },
          },
          path: tab ? { tab } : undefined,
        },
      });
    },
    [telemetry, email, openFlyout, userName, userRiskData, scopeId]
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
            <PreviewNavigation
              flyoutIsExpandable={hasUserDetailsData}
              expandDetails={openPanelFirstTab}
            />
            <UserPreviewPanelHeader
              userName={userName}
              observedUser={observedUserWithAnomalies}
              managedUser={managedUser}
            />
            <UserPreviewPanelContent
              userName={userName}
              managedUser={managedUser}
              observedUser={observedUserWithAnomalies}
              riskScoreState={riskScoreState}
              recalculatingScore={recalculatingScore}
              onAssetCriticalityChange={calculateEntityRiskScore}
              contextID={contextID}
              scopeId={scopeId}
              isDraggable={!!isDraggable}
              openDetailsPanel={openPanelTab}
            />
          </>
        );
      }}
    </AnomalyTableProvider>
  );
};

UserPreviewPanel.displayName = 'UserPreviewPanel';
