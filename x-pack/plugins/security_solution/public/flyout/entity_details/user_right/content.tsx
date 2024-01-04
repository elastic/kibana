/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule } from '@elastic/eui';

import React from 'react';
import { OBSERVED_USER_QUERY_ID } from '../../../explore/users/containers/users/observed_details';
import { RiskSummary } from '../../../entity_analytics/components/risk_summary_flyout/risk_summary';
import type { RiskScoreState } from '../../../entity_analytics/api/hooks/use_risk_score';
import { ManagedUser } from '../../../timelines/components/side_panel/new_user_detail/managed_user';
import type { ManagedUserData } from '../../../timelines/components/side_panel/new_user_detail/types';
import type { RiskScoreEntity, UserItem } from '../../../../common/search_strategy';
import { USER_PANEL_RISK_SCORE_QUERY_ID } from '.';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { ObservedEntity } from '../shared/components/observed_entity';
import type { ObservedEntityData } from '../shared/components/observed_entity/types';
import { useObservedUserItems } from './hooks/use_observed_user_items';
import type { EntityDetailsLeftPanelTab } from '../shared/components/left_panel/left_panel_header';

interface UserPanelContentProps {
  observedUser: ObservedEntityData<UserItem>;
  managedUser: ManagedUserData;
  riskScoreState: RiskScoreState<RiskScoreEntity.user>;
  contextID: string;
  scopeId: string;
  isDraggable: boolean;
  openDetailsPanel: (tab: EntityDetailsLeftPanelTab) => void;
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
  const observedFields = useObservedUserItems(observedUser);

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
      <ObservedEntity
        observedData={observedUser}
        contextID={contextID}
        scopeId={scopeId}
        isDraggable={isDraggable}
        observedFields={observedFields}
        queryId={OBSERVED_USER_QUERY_ID}
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
