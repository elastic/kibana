/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { UserDetailsLink } from '../../../../common/components/links';
import { AnomalyTableProvider } from '../../../../common/components/ml/anomaly/anomaly_table_provider';
import { getCriteriaFromUsersType } from '../../../../common/components/ml/criteria/get_criteria_from_users_type';
import { scoreIntervalToDateTime } from '../../../../common/components/ml/score/score_interval_to_datetime';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { setAbsoluteRangeDatePicker } from '../../../../common/store/inputs/actions';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { useObservedUserDetails } from '../../../../explore/users/containers/users/observed_details';
import { UsersType } from '../../../../explore/users/store/model';
import { UserOverview } from '../../../../overview/components/user_overview';

export const QUERY_ID = 'usersDetailsQuery';
export interface ExpandableUserProps {
  userName: string;
}

const StyledTitle = styled.h4`
  word-break: break-all;
  word-wrap: break-word;
  white-space: pre-wrap;
`;

export const ExpandableUserDetailsTitle = ({ userName }: { userName: string }) => (
  <EuiTitle size="s">
    <StyledTitle>
      {i18n.translate('xpack.securitySolution.timeline.sidePanel.userDetails.title', {
        defaultMessage: 'User details',
      })}
      {`: ${userName}`}
    </StyledTitle>
  </EuiTitle>
);

export const ExpandableUserDetailsPageLink = ({ userName }: ExpandableUserProps) => (
  <UserDetailsLink userName={userName} isButton>
    {i18n.translate('xpack.securitySolution.timeline.sidePanel.networkDetails.userDetails', {
      defaultMessage: 'View details page',
    })}
  </UserDetailsLink>
);

export const ExpandableUserDetails = ({
  contextID,
  scopeId,
  userName,
  isDraggable,
}: ExpandableUserProps & { contextID: string; scopeId: string; isDraggable?: boolean }) => {
  const { to, from, isInitializing } = useGlobalTime();
  const { selectedPatterns } = useSourcererDataView();
  const dispatch = useDispatch();

  const [loading, { userDetails }] = useObservedUserDetails({
    endDate: to,
    startDate: from,
    userName,
    indexNames: selectedPatterns,
    skip: isInitializing,
  });

  const narrowDateRange = useCallback(
    (score, interval) => {
      const fromTo = scoreIntervalToDateTime(score, interval);
      dispatch(
        setAbsoluteRangeDatePicker({
          id: InputsModelId.global,
          from: fromTo.from,
          to: fromTo.to,
        })
      );
    },
    [dispatch]
  );

  return (
    <AnomalyTableProvider
      criteriaFields={getCriteriaFromUsersType(UsersType.details, userName)}
      startDate={from}
      endDate={to}
      skip={isInitializing}
    >
      {({ isLoadingAnomaliesData, anomaliesData, jobNameById }) => (
        <UserOverview
          userName={userName}
          isInDetailsSidePanel={true}
          data={userDetails}
          loading={loading}
          contextID={contextID}
          scopeId={scopeId}
          isDraggable={isDraggable}
          id={QUERY_ID}
          anomaliesData={anomaliesData}
          isLoadingAnomaliesData={isLoadingAnomaliesData}
          startDate={from}
          endDate={to}
          narrowDateRange={narrowDateRange}
          indexPatterns={selectedPatterns}
          jobNameById={jobNameById}
        />
      )}
    </AnomalyTableProvider>
  );
};
