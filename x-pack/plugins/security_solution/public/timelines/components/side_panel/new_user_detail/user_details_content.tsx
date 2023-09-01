/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiSpacer,
  EuiHorizontalRule,
  EuiIcon,
  EuiBadge,
  EuiText,
  EuiFlexItem,
  EuiFlexGroup,
  useEuiFontSize,
  useEuiTheme,
  euiTextBreakWord,
  EuiProgress,
} from '@elastic/eui';

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { max } from 'lodash';
import * as i18n from './translations';

import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { UserDetailsLink } from '../../../../common/components/links';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import type { RiskScoreState } from '../../../../explore/containers/risk_score';
import { useRiskScore } from '../../../../explore/containers/risk_score';

import { useManagedUser, useObservedUser } from './hooks';
import { AnomalyTableProvider } from '../../../../common/components/ml/anomaly/anomaly_table_provider';
import { getCriteriaFromUsersType } from '../../../../common/components/ml/criteria/get_criteria_from_users_type';
import { UsersType } from '../../../../explore/users/store/model';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import type { ManagedUserData, ObservedUserData } from './types';
import { RiskScoreField } from './risk_score_field';
import { ObservedUser } from './observed_user';
import { ManagedUser } from './managed_user';

export const QUERY_ID = 'usersDetailsQuery';

interface UserDetailsContentComponentProps {
  userName: string;
  observedUser: ObservedUserData;
  managedUser: ManagedUserData;
  riskScoreState: RiskScoreState<RiskScoreEntity.user>;
  contextID: string;
  scopeId: string;
  isDraggable: boolean;
}

/**
 * This is a visual component. It doesn't access any external Context or API.
 * It designed for unit testing the UI and previewing changes on storybook.
 */
export const UserDetailsContentComponent = ({
  userName,
  observedUser,
  managedUser,
  riskScoreState,
  contextID,
  scopeId,
  isDraggable,
}: UserDetailsContentComponentProps) => {
  const { euiTheme } = useEuiTheme();
  const { fontSize: xlFontSize } = useEuiFontSize('xl');

  const lastSeenDate = useMemo(
    () =>
      max([observedUser.lastSeen, managedUser.lastSeen].map((el) => el.date && new Date(el.date))),
    [managedUser.lastSeen, observedUser.lastSeen]
  );

  return (
    <>
      <EuiFlexGroup
        gutterSize="m"
        alignItems="center"
        responsive={false}
        data-test-subj="user-details-content-header"
      >
        <EuiFlexItem grow={false}>
          <EuiIcon type="user" size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{i18n.USER}</EuiFlexItem>

        <EuiFlexItem grow={false}>
          {observedUser.lastSeen.date && (
            <EuiBadge data-test-subj="user-details-content-observed-badge" color="hollow">
              {i18n.OBSERVED_BADGE}
            </EuiBadge>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {managedUser.lastSeen.date && (
            <EuiBadge data-test-subj="user-details-content-managed-badge" color="hollow">
              {i18n.MANAGED_BADGE}
            </EuiBadge>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      {observedUser.lastSeen.isLoading || managedUser.lastSeen.isLoading ? (
        <EuiProgress size="xs" color="accent" />
      ) : (
        <EuiHorizontalRule margin="none" />
      )}
      <EuiSpacer size="m" />

      <UserDetailsLink userName={userName}>
        <span
          css={css`
            font-size: ${xlFontSize};
            font-weight: ${euiTheme.font.weight.bold};
            ${euiTextBreakWord()}
          `}
        >
          {userName}
        </span>
      </UserDetailsLink>
      <EuiSpacer size="m" />
      <EuiText size="xs" data-test-subj={'user-details-content-lastSeen'}>
        {i18n.LAST_SEEN}
        {': '}
        {lastSeenDate && <PreferenceFormattedDate value={lastSeenDate} />}
      </EuiText>
      <EuiHorizontalRule margin="xs" />
      <RiskScoreField riskScoreState={riskScoreState} />
      <EuiHorizontalRule margin="xs" />
      <EuiSpacer size="xxl" />
      <ObservedUser
        observedUser={observedUser}
        contextID={contextID}
        scopeId={scopeId}
        isDraggable={isDraggable}
      />
      <EuiSpacer />
      <ManagedUser
        managedUser={managedUser}
        contextID={contextID}
        scopeId={scopeId}
        isDraggable={isDraggable}
      />
    </>
  );
};

export const UserDetailsContent = ({
  userName,
  contextID,
  scopeId,
  isDraggable = false,
}: {
  userName: string;
  contextID: string;
  scopeId: string;
  isDraggable?: boolean;
}) => {
  const { to, from, isInitializing } = useGlobalTime();
  const riskScoreState = useRiskScore({
    riskEntity: RiskScoreEntity.user,
  });
  const observedUser = useObservedUser(userName);
  const managedUser = useManagedUser(userName);

  return (
    <AnomalyTableProvider
      criteriaFields={getCriteriaFromUsersType(UsersType.details, userName)}
      startDate={from}
      endDate={to}
      skip={isInitializing}
    >
      {({ isLoadingAnomaliesData, anomaliesData, jobNameById }) => (
        <UserDetailsContentComponent
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
          isDraggable={isDraggable}
        />
      )}
    </AnomalyTableProvider>
  );
};
