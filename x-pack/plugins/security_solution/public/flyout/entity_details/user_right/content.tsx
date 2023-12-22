/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule } from '@elastic/eui';

import React from 'react';
import { RiskSummary } from '../../../entity_analytics/components/risk_summary_flyout/risk_summary';
import type { RiskScoreState } from '../../../entity_analytics/api/hooks/use_risk_score';
import { ManagedUser } from '../../../timelines/components/side_panel/new_user_detail/managed_user';
import type {
  ManagedUserData,
  ObservedUserData,
} from '../../../timelines/components/side_panel/new_user_detail/types';
import { ObservedUser } from '../../../timelines/components/side_panel/new_user_detail/observed_user';
import type { RiskScoreEntity } from '../../../../common/search_strategy';
import { USER_PANEL_RISK_SCORE_QUERY_ID } from '.';
import { FlyoutBody } from '../../shared/components/flyout_body';
import type { UserDetailsLeftPanelTab } from '../user_details_left/tabs';

interface UserPanelContentProps {
  observedUser: ObservedUserData;
  managedUser: ManagedUserData;
  riskScoreState: RiskScoreState<RiskScoreEntity.user>;
  contextID: string;
  scopeId: string;
  isDraggable: boolean;
  openDetailsPanel: (tab: UserDetailsLeftPanelTab) => void;
}

export const UserPanelContent = ({
  observedUser,
  managedUser,
  riskScoreState,
  contextID,
  scopeId,
  isDraggable,
  openDetailsPanel,
}: UserPanelContentProps) => {
  return (
    <FlyoutBody>
      {riskScoreState.isModuleEnabled && riskScoreState.data?.length !== 0 && (
        <>
          <RiskSummary
            riskScoreData={riskScoreState}
            queryId={USER_PANEL_RISK_SCORE_QUERY_ID}
            openDetailsPanel={openDetailsPanel}
          />
          <EuiHorizontalRule margin="m" />
        </>
      )}
      <ObservedUser
        observedUser={observedUser}
        contextID={contextID}
        scopeId={scopeId}
        isDraggable={isDraggable}
      />
      <EuiHorizontalRule margin="m" />
      <ManagedUser
        managedUser={managedUser}
        contextID={contextID}
        isDraggable={isDraggable}
        openDetailsPanel={openDetailsPanel}
      />
    </FlyoutBody>
  );
};
