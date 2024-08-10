/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

import React from 'react';
import { noop } from 'lodash';
import { css } from '@emotion/css';
import { RelatedEntitiesSummary } from '../../../entity_analytics/components/related_entities/related_entities_summary';
import { useEntityResolutions } from '../../../entity_analytics/api/hooks/use_entity_resolutions';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { AssetCriticalityAccordion } from '../../../entity_analytics/components/asset_criticality/asset_criticality_selector';

import { OBSERVED_USER_QUERY_ID } from '../../../explore/users/containers/users/observed_details';
import { FlyoutRiskSummary } from '../../../entity_analytics/components/risk_summary_flyout/risk_summary';
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

      <EntityDetailsSection
        observedUser={observedUser}
        userName={userName}
        contextID={contextID}
        scopeId={scopeId}
        isDraggable={isDraggable}
        openDetailsPanel={openDetailsPanel}
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

type Props = Pick<
  UserPanelContentProps,
  'userName' | 'observedUser' | 'contextID' | 'scopeId' | 'isDraggable' | 'openDetailsPanel'
>;

const EntityDetailsSection: React.FC<Props> = ({
  observedUser,
  userName,
  contextID,
  scopeId,
  isDraggable,
  openDetailsPanel,
}) => {
  const { euiTheme } = useEuiTheme();
  const observedFields = useObservedUserItems(observedUser);
  const resolution = useEntityResolutions({
    name: userName,
    type: 'user',
  });

  return (
    <>
      <EuiAccordion
        initialIsOpen
        id="entity-details-accordion"
        buttonContent={
          <EuiTitle size="m">
            <h3>
              <EuiText>{'Entity details'}</EuiText>
            </h3>
          </EuiTitle>
        }
        buttonProps={{
          css: css`
            color: ${euiTheme.colors.primary};
          `,
        }}
        data-test-subj="entity-details-accordion"
      >
        <EuiSpacer size="m" />
        <RelatedEntitiesSummary resolution={resolution} onOpen={openDetailsPanel || noop} />
        <EuiSpacer size="m" />
        <ObservedEntity
          observedData={observedUser}
          contextID={contextID}
          scopeId={scopeId}
          isDraggable={isDraggable}
          observedFields={observedFields}
          queryId={OBSERVED_USER_QUERY_ID}
        />
      </EuiAccordion>
      <EuiSpacer size="m" />
    </>
  );
};
