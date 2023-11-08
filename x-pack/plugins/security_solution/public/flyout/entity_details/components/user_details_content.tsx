/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { EuiFlyoutBody } from '@elastic/eui';
import type { RiskScoreState } from '../../../explore/containers/risk_score';
import type {
  ManagedUserData,
  ObservedUserData,
} from '../../../timelines/components/side_panel/new_user_detail/types';
import type { RiskScoreEntity } from '../../../../common/risk_engine';
import { FlyoutLoading } from '../../shared/components/flyout_loading';
import { UserDetailsBody } from './user_details_body';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';
import { RiskInputsPanelKey } from '../../risk_inputs';

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
    <>
      <FlyoutNavigation flyoutIsExpandable={!!userRiskData?.user.risk} expandDetails={openPanel} />
      <EuiFlyoutBody>
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
