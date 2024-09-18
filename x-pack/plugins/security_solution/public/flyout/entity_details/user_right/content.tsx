/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule } from '@elastic/eui';

import React from 'react';
import { FlyoutBody } from '@kbn/security-solution-common';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { AssetCriticalityAccordion } from '../../../entity_analytics/components/asset_criticality/asset_criticality_selector';

import { OBSERVED_USER_QUERY_ID } from '../../../explore/users/containers/users/observed_details';
import { FlyoutRiskSummary } from '../../../entity_analytics/components/risk_summary_flyout/risk_summary';
import type { RiskScoreState } from '../../../entity_analytics/api/hooks/use_risk_score';
import { ManagedUser } from './components/managed_user';
import type { ManagedUserData } from './types';
import type { RiskScoreEntity, UserItem } from '../../../../common/search_strategy';
import { USER_PANEL_RISK_SCORE_QUERY_ID } from '.';
import { ObservedEntity } from '../shared/components/observed_entity';
import type { ObservedEntityData } from '../shared/components/observed_entity/types';
import { useObservedUserItems } from './hooks/use_observed_user_items';
import type { EntityDetailsLeftPanelTab } from '../shared/components/left_panel/left_panel_header';

interface UserPanelContentProps {
  userName: string;
  observedUser: ObservedEntityData<UserItem>;
  managedUser: ManagedUserData;
  riskScoreState: RiskScoreState<RiskScoreEntity.user>;
  recalculatingScore: boolean;
  contextID: string;
  scopeId: string;
  isDraggable: boolean;
  onAssetCriticalityChange: () => void;
  openDetailsPanel?: (tab: EntityDetailsLeftPanelTab) => void;
  isPreviewMode?: boolean;
}

export const UserPanelContent = ({
  userName,
  observedUser,
  managedUser,
  riskScoreState,
  recalculatingScore,
  contextID,
  scopeId,
  isDraggable,
  openDetailsPanel,
  onAssetCriticalityChange,
  isPreviewMode,
}: UserPanelContentProps) => {
  const observedFields = useObservedUserItems(observedUser);
  const isManagedUserEnable = useIsExperimentalFeatureEnabled('newUserDetailsFlyoutManagedUser');

  return (
    <FlyoutBody>
      {riskScoreState.isModuleEnabled && riskScoreState.data?.length !== 0 && (
        <>
          <FlyoutRiskSummary
            riskScoreData={riskScoreState}
            recalculatingScore={recalculatingScore}
            queryId={USER_PANEL_RISK_SCORE_QUERY_ID}
            openDetailsPanel={openDetailsPanel}
            isPreviewMode={isPreviewMode}
          />
          <EuiHorizontalRule />
        </>
      )}
      <AssetCriticalityAccordion
        entity={{ name: userName, type: 'user' }}
        onChange={onAssetCriticalityChange}
      />
      <ObservedEntity
        observedData={observedUser}
        contextID={contextID}
        scopeId={scopeId}
        isDraggable={isDraggable}
        observedFields={observedFields}
        queryId={OBSERVED_USER_QUERY_ID}
      />
      <EuiHorizontalRule margin="m" />
      {isManagedUserEnable && (
        <ManagedUser
          managedUser={managedUser}
          contextID={contextID}
          isDraggable={isDraggable}
          openDetailsPanel={openDetailsPanel}
        />
      )}
    </FlyoutBody>
  );
};
