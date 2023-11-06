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
  useEuiTheme,
  EuiTitle,
  EuiPanel,
} from '@elastic/eui';

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { max } from 'lodash/fp';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { getUsersDetailsUrl } from '../../../common/components/link_to/redirect_to_users';
import type {
  ManagedUserData,
  ObservedUserData,
} from '../../../timelines/components/side_panel/new_user_detail/types';
import { ManagedUser } from '../../../timelines/components/side_panel/new_user_detail/managed_user';
import { ObservedUser } from '../../../timelines/components/side_panel/new_user_detail/observed_user';
import * as i18n from './translations';

import type { RiskScoreEntity } from '../../../../common/search_strategy';
import { SecuritySolutionLinkAnchor } from '../../../common/components/links';
import type { RiskScoreState } from '../../../explore/containers/risk_score';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { RiskSummary } from './risk_summary';

export const QUERY_ID = 'usersDetailsQuery';

interface UserDetailsBodyComponentProps {
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
export const UserDetailsBody = ({
  userName,
  observedUser,
  managedUser,
  riskScoreState,
  contextID,
  scopeId,
  isDraggable,
}: UserDetailsBodyComponentProps) => {
  const { euiTheme } = useEuiTheme();

  const lastSeenDate = useMemo(
    () =>
      max([observedUser.lastSeen, managedUser.lastSeen].map((el) => el.date && new Date(el.date))),
    [managedUser.lastSeen, observedUser.lastSeen]
  );

  return (
    <>
      <EuiPanel hasShadow={false}>
        <EuiFlexGroup gutterSize="s" responsive={false} direction="column">
          <EuiFlexItem grow={false}>
            <EuiText size="xs" data-test-subj={'user-details-content-lastSeen'}>
              {lastSeenDate && <PreferenceFormattedDate value={lastSeenDate} />}
              <EuiSpacer size="xs" />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="user" size="l" color="primary" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h2>
                    <SecuritySolutionLinkAnchor
                      deepLinkId={SecurityPageName.users}
                      path={getUsersDetailsUrl(userName)}
                      target={'_blank'}
                      css={css`
                        font-weight: ${euiTheme.font.weight.bold};
                      `}
                    >
                      {userName}
                    </SecuritySolutionLinkAnchor>
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              responsive={false}
              data-test-subj="user-details-content-header"
            >
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
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiHorizontalRule margin="xs" />
      {riskScoreState.isModuleEnabled && riskScoreState.data?.length !== 0 && (
        <>
          <EuiPanel hasShadow={false}>
            <RiskSummary riskScoreData={riskScoreState} />
          </EuiPanel>
          <EuiHorizontalRule margin="xs" />
        </>
      )}

      <EuiPanel hasShadow={false}>
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
      </EuiPanel>
    </>
  );
};
