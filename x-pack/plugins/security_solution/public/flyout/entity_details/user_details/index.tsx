/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
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
import { UserDetailsContent } from '../components/user_details_content';

export interface UserDetailsPanelProps extends Record<string, unknown> {
  contextID: string;
  scopeId: string;
  userName: string;
  isDraggable?: boolean;
}

export interface UserDetailsExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'user-details';
  params: UserDetailsPanelProps;
}

export const UserDetailsPanelKey: UserDetailsExpandableFlyoutProps['key'] = 'user-details';
export const USER_DETAILS_RISK_SCORE_QUERY_ID = 'userDetailsRiskScoreQuery';
const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

export const UserDetailsPanel = ({
  contextID,
  scopeId,
  userName,
  isDraggable,
}: UserDetailsPanelProps) => {
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

  useQueryInspector({
    deleteQuery,
    inspect,
    loading,
    queryId: USER_DETAILS_RISK_SCORE_QUERY_ID,
    refetch,
    setQuery,
  });

  return (
    <AnomalyTableProvider
      criteriaFields={getCriteriaFromUsersType(UsersType.details, userName)}
      startDate={from}
      endDate={to}
      skip={isInitializing}
    >
      {({ isLoadingAnomaliesData, anomaliesData, jobNameById }) => (
        <UserDetailsContent
          userName={userName}
          managedUser={managedUser}
          observedUser={{
            ...observedUser,
            anomalies: {
              isLoading: isLoadingAnomaliesData,
              anomalies: anomaliesData,
              jobNameById,
            },
          }}
          riskScoreState={riskScoreState}
          contextID={contextID}
          scopeId={scopeId}
          isDraggable={!!isDraggable}
        />
      )}
    </AnomalyTableProvider>
  );
};

UserDetailsPanel.displayName = 'UserDetailsPanel';
