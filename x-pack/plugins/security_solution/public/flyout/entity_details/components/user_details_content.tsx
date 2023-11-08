/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import type { RiskScoreState } from '../../../explore/containers/risk_score';
import type {
  ManagedUserData,
  ObservedUserData,
} from '../../../timelines/components/side_panel/new_user_detail/types';
import type { RiskScoreEntity } from '../../../../common/risk_engine';
import { ExpandFlyoutButton } from './expand_flyout_button';
import { useExpandDetailsFlyout } from '../hooks/use_expand_details_flyout';

import { FlyoutLoading } from '../../shared/components/flyout_loading';
import { UserDetailsBody } from './user_details_body';

export interface UserDetailsContentProps extends Record<string, unknown> {
  userName: string;
  observedUser: ObservedUserData;
  managedUser: ManagedUserData;
  riskScoreState: RiskScoreState<RiskScoreEntity.user>;
  contextID: string;
  scopeId: string;
  isDraggable: boolean;
}

export interface UserDetailsExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'user-details';
  params: UserDetailsContentProps;
}

export const UserDetailsContentKey: UserDetailsExpandableFlyoutProps['key'] = 'user-details';
export const USER_DETAILS_RISK_SCORE_QUERY_ID = 'userDetailsRiskScoreQuery';

/**
 * This is a visual component. It doesn't access any external Context or API.
 * It designed for unit testing the UI and previewing changes on storybook.
 */
export const UserDetailsContent = ({
  observedUser,
  managedUser,
  contextID,
  scopeId,
  userName,
  isDraggable,
  riskScoreState,
}: UserDetailsContentProps) => {
  const { data: userRisk } = riskScoreState;
  const userRiskData = userRisk && userRisk.length > 0 ? userRisk[0] : undefined;
  const riskInputs = userRiskData?.user.risk.inputs ?? [];

  const { isExpanded, togglePanel } = useExpandDetailsFlyout({ riskInputs });

  if (riskScoreState.loading || observedUser.isLoading || managedUser.isLoading) {
    return <FlyoutLoading />;
  }

  return (
    <>
      <EuiFlyoutHeader
        hasBorder
        // Temporary code to force the FlyoutHeader height.
        // Please delete it when FlyoutHeader supports multiple heights.
        css={css`
          &.euiFlyoutHeader {
            padding: 5px 0;
            min-height: 34px;
          }
        `}
      >
        {riskInputs.length > 0 && (
          <ExpandFlyoutButton
            isExpanded={isExpanded}
            onToggle={togglePanel}
            expandedText={i18n.translate(
              'xpack.securitySolution.flyout.entityDetails.header.expandDetailButtonLabel',
              {
                defaultMessage: 'Collapse details',
              }
            )}
            collapsedText={i18n.translate(
              'xpack.securitySolution.flyout.entityDetails.header.collapseDetailButtonLabel',
              {
                defaultMessage: 'Expand details',
              }
            )}
          />
        )}
      </EuiFlyoutHeader>

      <EuiFlyoutBody
        css={css`
          .euiFlyoutBody__overflowContent {
            padding: 0;
          }
        `}
      >
        <UserDetailsBody
          userName={userName}
          managedUser={managedUser}
          observedUser={observedUser}
          riskScoreState={riskScoreState}
          contextID={contextID}
          scopeId={scopeId}
          isDraggable={!!isDraggable}
        />
      </EuiFlyoutBody>
    </>
  );
};

UserDetailsContent.displayName = 'UserDetailsContent';
