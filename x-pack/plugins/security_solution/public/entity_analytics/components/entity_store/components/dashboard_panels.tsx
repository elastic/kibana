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
  EuiLoadingLogo,
  EuiPanel,
} from '@elastic/eui';

import { RiskEngineStatusEnum } from '../../../../../common/api/entity_analytics';
import { RiskScoreEntity } from '../../../../../common/search_strategy';

import { Panel } from '../../../../common/components/panel';
import { HeaderSection } from '../../../../common/components/header_section';
import { EntityAnalyticsLearnMoreLink } from '../../risk_score_onboarding/entity_analytics_doc_link';
import { EntitiesList } from '../entities_list';

import { useEntityStoreEnablement } from '../hooks/use_entity_store';
import { EntityStoreEnablementModal, type Enablements } from './enablement_modal';

import { EntityAnalyticsRiskScores } from '../../entity_analytics_risk_score';
import { useInitRiskEngineMutation } from '../../../api/hooks/use_init_risk_engine_mutation';
import { useEntityEngineStatus } from '../hooks/use_entity_engine_status';

const EntityStoreDashboardPanelsComponent = () => {
  const [modal, setModalState] = useState({ visible: false });
  const [riskEngineInitializing, setRiskEngineInitializing] = useState(false);

  const entityStore = useEntityEngineStatus();
  const { enable: enableStore } = useEntityStoreEnablement();
  const { mutate: initRiskEngine } = useInitRiskEngineMutation();

  const enableEntityStore = (enable: Enablements) => () => {
    setModalState({ visible: false });
    if (enable.riskScore) {
      const options = {
        onSuccess: () => {
          setRiskEngineInitializing(false);
          if (enable.entityStore) {
            enableStore();
          }
        },
      };
      setRiskEngineInitializing(true);
      initRiskEngine(undefined, options);
    }

    if (enable.entityStore) {
      enableStore();
    }
  };

  if (entityStore.status === 'loading') {
    return (
      <EuiPanel hasBorder>
        <EuiEmptyPrompt
          icon={<EuiLoadingSpinner size="xl" />}
          title={<h2>{'Initializing store'}</h2>}
        />
      </EuiPanel>
    );
  }

  if (entityStore.status === 'installing') {
    return (
      <EuiPanel hasBorder>
        <EuiEmptyPrompt
          icon={<EuiLoadingLogo logo="logoElastic" size="xl" />}
          title={<h2>{'Initializing store'}</h2>}
        />
      </EuiPanel>
    );
  }

  const isRiskScoreAvailable =
    entityStore.riskEngineStatus.data &&
    entityStore.riskEngineStatus.data.risk_engine_status !== RiskEngineStatusEnum.NOT_INSTALLED;

  return (
    <EuiFlexGroup direction="column" data-test-subj="entityStorePanelsGroup">
      {entityStore.status === 'enabled' && isRiskScoreAvailable && (
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
      {entityStore.status === 'enabled' && !isRiskScoreAvailable && (
        <>
          <EuiFlexItem>
            <EnableRiskScore
              onEnable={() => setModalState({ visible: true })}
              loading={riskEngineInitializing}
            />
          </EuiFlexItem>

          <EuiFlexItem>
            <EntitiesList />
          </EuiFlexItem>
        </>
      )}

      {entityStore.status === 'not_installed' && !isRiskScoreAvailable && (
        // TODO: Move modal inside EnableEntityStore component, eliminating the onEnable prop in favour of forwarding the riskScoreEnabled status
        <EnableEntityStore onEnable={() => setModalState({ visible: true })} />
      )}

      {entityStore.status === 'not_installed' && isRiskScoreAvailable && (
        <>
          <EuiFlexItem>
            <EnableEntityStore
              onEnable={() =>
                setModalState({
                  visible: true,
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
        toggle={(visible) => setModalState({ visible })}
        enableStore={enableEntityStore}
        riskScore={{ disabled: isRiskScoreAvailable, checked: !isRiskScoreAvailable }}
        entityStore={{
          disabled: entityStore.status === 'enabled',
          checked: entityStore.status !== 'enabled',
        }}
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

interface EnableRiskEngineProps {
  onEnable: () => void;
  loading: boolean;
}

export const EnableRiskScore: React.FC<EnableRiskEngineProps> = ({ onEnable, loading }) => {
  if (loading) {
    return (
      <EuiPanel hasBorder>
        <EuiEmptyPrompt
          icon={<EuiLoadingLogo logo="logoElastic" size="xl" />}
          title={<h2>{'Initializing risk engine'}</h2>}
        />
      </EuiPanel>
    );
  }
  return (
    <Panel hasBorder data-test-subj={`entity_analytics_enable_risk_score`}>
      <HeaderSection title={'Risk Store'} titleSize="s" />
      <EuiEmptyPrompt
        title={<h2>{'Placeholder title'}</h2>}
        body={
          <>
            {'Placeholder text'}
            <EntityAnalyticsLearnMoreLink />
          </>
        }
        actions={
          <EuiToolTip content={'Enable Risk Score'}>
            <EuiButton
              color="primary"
              fill
              onClick={onEnable}
              data-test-subj={`enable_risk_score_btn`}
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
