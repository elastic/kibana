/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { UsersType } from '../../../explore/users/store/model';
import { getCriteriaFromUsersType } from '../../../common/components/ml/criteria/get_criteria_from_users_type';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import {
  useManagedUser,
  useObservedUser,
} from '../../../timelines/components/side_panel/new_user_detail/hooks';
import { AnomalyTableProvider } from '../../../common/components/ml/anomaly/anomaly_table_provider';
import { buildUserNamesFilter } from '../../../../common/search_strategy';
import { useRiskScore } from '../../../explore/containers/risk_score';
import { RiskScoreEntity } from '../../../../common/risk_engine';
import { FlyoutLoading } from '../../shared/components/flyout_loading';
import { RiskInputsPanelKey } from '../risk_inputs_left';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';
import { UserPanelContent } from './content';
import { UserPanelHeader } from './header';

export interface UserPanelProps extends Record<string, unknown> {
  contextID: string;
  scopeId: string;
  userName: string;
  isDraggable?: boolean;
}

export interface UserPanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'user-panel';
  params: UserPanelProps;
}

export const UserPanelKey: UserPanelExpandableFlyoutProps['key'] = 'user-panel';
export const USER_PANEL_RISK_SCORE_QUERY_ID = 'userPanelRiskScoreQuery';
const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

export const UserPanel = ({ contextID, scopeId, userName, isDraggable }: UserPanelProps) => {
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

  const observedUser = useObservedUser(userName);
  const managedUser = useManagedUser(userName);

  const { data: userRisk } = riskScoreState;
  const userRiskData = userRisk && userRisk.length > 0 ? userRisk[0] : undefined;

  useQueryInspector({
    deleteQuery,
    inspect,
    loading,
    queryId: USER_PANEL_RISK_SCORE_QUERY_ID,
    refetch,
    setQuery,
  });

  const { openLeftPanel } = useExpandableFlyoutContext();
  const openPanel = useCallback(() => {
    openLeftPanel({
      id: RiskInputsPanelKey,
      params: {
        riskInputs: userRiskData?.user.risk.inputs,
      },
    });
  }, [openLeftPanel, userRiskData?.user.risk.inputs]);

  if (riskScoreState.loading || observedUser.isLoading || managedUser.isLoading) {
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
              flyoutIsExpandable={!!userRiskData?.user.risk}
              expandDetails={openPanel}
            />
            <UserPanelHeader
              userName={userName}
              observedUser={observedUserWithAnomalies}
              managedUser={managedUser}
            />
            <UserPanelContent
              managedUser={managedUser}
              observedUser={observedUserWithAnomalies}
              riskScoreState={riskScoreState}
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

UserPanel.displayName = 'UserPanel';
