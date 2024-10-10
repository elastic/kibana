/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiToolTip,
  EuiButton,
  EuiLoadingSpinner,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';

import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { useRefetchQueries } from '../../../../common/hooks/use_refetch_queries';

import { Panel } from '../../../../common/components/panel';
import { HeaderSection } from '../../../../common/components/header_section';
import { EntityAnalyticsLearnMoreLink } from '../../risk_score_onboarding/entity_analytics_doc_link';
import { EntitiesList } from '../entities_list';

import { useEntityStore } from '../hooks/use_entity_store';
import { EntityStoreEnablementModal, type Enablements } from './enablement_modal';
import { EnableRiskScore } from '../../enable_risk_score';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { EntityAnalyticsRiskScores } from '../../entity_analytics_risk_score';

const EntityStoreDashboardPanelsComponent = () => {
  const [modal, setModalState] = useState({ visible: false, enablements: {} });

  const entityStore = useEntityStore();

  // NOTE: Props needed only for current implementation of the EnableRiskScore component
  const refreshPage = useRefetchQueries();
  const { deleteQuery, setQuery, from, to } = useGlobalTime();

  const enableEntityStore = (enable: Enablements) => () => {
    setModalState({ visible: false, enablements: enable });
    if (enable.riskScore) {
      // return enableRiskScore().then(() => {
      //   if (enablements.entityStore) {
      //     entityStore.enablement.enableEntityStore();
      //   }
      // });
    }

    if (enable.entityStore) {
      entityStore.enablement.enableEntityStore();
    }
  };

  if (entityStore.enablement.loading) {
    return <EuiLoadingSpinner size="xl" />;
  }

  const isRiskScoreEnabled =
    entityStore.status.newRiskScore.installed ||
    entityStore.status.legacyHostRiskScore.isEnabled ||
    entityStore.status.legacyUserRiskScore.isEnabled;

  return (
    <EuiFlexGroup direction="column" data-test-subj="entityStorePanelsGroup">
      {entityStore.status.entityStore.status === 'enabled' && isRiskScoreEnabled && (
        <>
          <EuiFlexItem>
            <EntitiesList />
          </EuiFlexItem>

          <EuiFlexItem>
            <EntityAnalyticsRiskScores riskEntity={RiskScoreEntity.user} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EntityAnalyticsRiskScores riskEntity={RiskScoreEntity.host} />
          </EuiFlexItem>
        </>
      )}
      {entityStore.status.entityStore.status === 'enabled' && !isRiskScoreEnabled && (
        <>
          {/* QUESTION: Should we have a separate component for enabling risk score? Current one seems too overloaded */}
          <EuiFlexItem>
            <EnableRiskScore
              entityType={RiskScoreEntity.user}
              timerange={{ from, to }}
              refetch={refreshPage}
              isDisabled={false}
              isDeprecated={entityStore.status.legacyUserRiskScore.isDeprecated}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EnableRiskScore
              entityType={RiskScoreEntity.host}
              timerange={{ from, to }}
              refetch={refreshPage}
              isDisabled={false}
              isDeprecated={entityStore.status.legacyHostRiskScore.isDeprecated}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EntitiesList />
          </EuiFlexItem>
        </>
      )}

      {entityStore.status.entityStore.status === 'not_installed' && !isRiskScoreEnabled && (
        // TODO: Move modal inside EnableEntityStore component, eliminating the onEnable prop in favour of forwarding the riskScoreEnabled status
        <EnableEntityStore
          onEnable={() =>
            setModalState({ visible: true, enablements: { riskScore: true, entityStore: true } })
          }
        />
      )}

      {entityStore.status.entityStore.status === 'not_installed' && isRiskScoreEnabled && (
        <>
          <EuiFlexItem>
            <EnableEntityStore
              onEnable={() =>
                setModalState({
                  visible: true,
                  enablements: { riskScore: false, entityStore: true },
                })
              }
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EntityAnalyticsRiskScores riskEntity={RiskScoreEntity.user} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EntityAnalyticsRiskScores riskEntity={RiskScoreEntity.host} />
          </EuiFlexItem>
        </>
      )}

      <EntityStoreEnablementModal
        visible={modal.visible}
        toggle={(visible) => setModalState((prev) => ({ ...prev, visible }))}
        enableStore={enableEntityStore}
        riskScore={modal.enablements}
      />
    </EuiFlexGroup>
  );
};

interface EnableEntityStoreProps {
  onEnable: () => void;
}

export const EnableEntityStore: React.FC<EnableEntityStoreProps> = ({ onEnable }) => {
  return (
    <Panel hasBorder data-test-subj={`entity_analytics_entity_store`}>
      <HeaderSection title={'Entity Store'} titleSize="s" />
      <EuiEmptyPrompt
        title={<h2>{'Placeholder title'}</h2>}
        body={
          <>
            {'Placeholder text'}
            <EntityAnalyticsLearnMoreLink />
          </>
        }
        actions={
          <EuiToolTip content={'Enable Entity Store'}>
            <EuiButton
              color="primary"
              fill
              onClick={onEnable}
              data-test-subj={`enable_entity_store_btn`}
            >
              {'Enable'}
            </EuiButton>
          </EuiToolTip>
        }
      />
    </Panel>
  );
};

export const EntityStoreDashboardPanels = React.memo(EntityStoreDashboardPanelsComponent);
EntityStoreDashboardPanels.displayName = 'EntityStoreDashboardPanels';
