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
  EuiImage,
  EuiCallOut,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { RiskEngineStatusEnum } from '../../../../../common/api/entity_analytics';
import { RiskScoreEntity } from '../../../../../common/search_strategy';

import { EntitiesList } from '../entities_list';

import { useEntityStoreEnablement } from '../hooks/use_entity_store';
import { EntityStoreEnablementModal, type Enablements } from './enablement_modal';

import { EntityAnalyticsRiskScores } from '../../entity_analytics_risk_score';
import { useInitRiskEngineMutation } from '../../../api/hooks/use_init_risk_engine_mutation';
import { useEntityEngineStatus } from '../hooks/use_entity_engine_status';

import dashboardEnableImg from '../../../images/entity_store_dashboard.png';
import {
  ENABLEMENT_DESCRIPTION_BOTH,
  ENABLEMENT_DESCRIPTION_ENTITY_STORE_ONLY,
  ENABLEMENT_DESCRIPTION_RISK_ENGINE_ONLY,
  ENABLEMENT_INITIALIZING_ENTITY_STORE,
  ENABLEMENT_INITIALIZING_RISK_ENGINE,
  ENABLE_ALL_TITLE,
  ENABLE_ENTITY_STORE_TITLE,
  ENABLE_RISK_SCORE_TITLE,
} from '../translations';
import { useRiskEngineStatus } from '../../../api/hooks/use_risk_engine_status';

const EntityStoreDashboardPanelsComponent = () => {
  const [modal, setModalState] = useState({ visible: false });
  const [riskEngineInitializing, setRiskEngineInitializing] = useState(false);

  const entityStore = useEntityEngineStatus();
  const riskEngineStatus = useRiskEngineStatus();

  const { enable: enableStore, query } = useEntityStoreEnablement();

  const { mutate: initRiskEngine } = useInitRiskEngineMutation();

  const callouts = entityStore.errors.map((err) => (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStore.enablement.errors.title"
          defaultMessage={'An error occurred during entity store resource initialization'}
        />
      }
      color="danger"
      iconType="error"
    >
      <p>{err?.message}</p>
    </EuiCallOut>
  ));

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
      return;
    }

    if (enable.entityStore) {
      enableStore();
    }
  };

  if (query.error) {
    return (
      <>
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityStore.enablement.errors.queryErrorTitle"
              defaultMessage={'There was a problem initializing the entity store'}
            />
          }
          color="danger"
          iconType="error"
        >
          <p>{(query.error as { body: { message: string } }).body.message}</p>
        </EuiCallOut>
        {callouts}
      </>
    );
  }

  if (entityStore.status === 'loading') {
    return (
      <EuiPanel hasBorder>
        <EuiEmptyPrompt
          icon={<EuiLoadingSpinner size="xl" />}
          title={<h2>{ENABLEMENT_INITIALIZING_ENTITY_STORE}</h2>}
        />
      </EuiPanel>
    );
  }

  if (entityStore.status === 'installing') {
    return (
      <EuiPanel hasBorder>
        <EuiEmptyPrompt
          icon={<EuiLoadingLogo logo="logoElastic" size="xl" />}
          title={<h2>{ENABLEMENT_INITIALIZING_ENTITY_STORE}</h2>}
          body={
            <p>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.entityStore.enablement.initializing.description"
                defaultMessage="This can take up to 5 minutes."
              />
            </p>
          }
        />
      </EuiPanel>
    );
  }

  // TODO Rename variable because the Risk score could be installed but disabled
  const isRiskScoreAvailable =
    riskEngineStatus.data &&
    riskEngineStatus.data.risk_engine_status !== RiskEngineStatusEnum.NOT_INSTALLED;

  return (
    <EuiFlexGroup direction="column" data-test-subj="entityStorePanelsGroup">
      {entityStore.status === 'error' && isRiskScoreAvailable && (
        <>
          {callouts}
          <EuiFlexItem>
            <EntityAnalyticsRiskScores riskEntity={RiskScoreEntity.user} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EntityAnalyticsRiskScores riskEntity={RiskScoreEntity.host} />
          </EuiFlexItem>
        </>
      )}
      {entityStore.status === 'error' && !isRiskScoreAvailable && (
        <>
          {callouts}
          <EuiFlexItem>
            <EnableEntityStore
              onEnable={() => setModalState({ visible: true })}
              loadingRiskEngine={riskEngineInitializing}
              enablements="riskScore"
            />
          </EuiFlexItem>
        </>
      )}
      {entityStore.status === 'enabled' && isRiskScoreAvailable && (
        <>
          <EuiFlexItem>
            <EntityAnalyticsRiskScores riskEntity={RiskScoreEntity.user} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EntityAnalyticsRiskScores riskEntity={RiskScoreEntity.host} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EntitiesList />
          </EuiFlexItem>
        </>
      )}
      {entityStore.status === 'enabled' && !isRiskScoreAvailable && (
        <>
          <EuiFlexItem>
            <EnableEntityStore
              onEnable={() => setModalState({ visible: true })}
              loadingRiskEngine={riskEngineInitializing}
              enablements="riskScore"
            />
          </EuiFlexItem>

          <EuiFlexItem>
            <EntitiesList />
          </EuiFlexItem>
        </>
      )}

      {(entityStore.status === 'not_installed' || entityStore.status === 'stopped') &&
        !isRiskScoreAvailable && (
          // TODO: Move modal inside EnableEntityStore component, eliminating the onEnable prop in favour of forwarding the riskScoreEnabled status
          <EnableEntityStore
            enablements="both"
            onEnable={() => setModalState({ visible: true })}
            loadingRiskEngine={riskEngineInitializing}
          />
        )}

      {(entityStore.status === 'not_installed' || entityStore.status === 'stopped') &&
        isRiskScoreAvailable && (
          <>
            <EuiFlexItem>
              <EnableEntityStore
                enablements="store"
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
  enablements: 'store' | 'riskScore' | 'both';
  loadingRiskEngine?: boolean;
}

export const EnableEntityStore: React.FC<EnableEntityStoreProps> = ({
  onEnable,
  enablements,
  loadingRiskEngine,
}) => {
  const title =
    enablements === 'store'
      ? ENABLE_ENTITY_STORE_TITLE
      : enablements === 'riskScore'
      ? ENABLE_RISK_SCORE_TITLE
      : ENABLE_ALL_TITLE;

  const body =
    enablements === 'store'
      ? ENABLEMENT_DESCRIPTION_ENTITY_STORE_ONLY
      : enablements === 'riskScore'
      ? ENABLEMENT_DESCRIPTION_RISK_ENGINE_ONLY
      : ENABLEMENT_DESCRIPTION_BOTH;

  if (loadingRiskEngine) {
    return (
      <EuiPanel hasBorder>
        <EuiEmptyPrompt
          icon={<EuiLoadingLogo logo="logoElastic" size="xl" />}
          title={<h2>{ENABLEMENT_INITIALIZING_RISK_ENGINE}</h2>}
        />
      </EuiPanel>
    );
  }
  return (
    <EuiEmptyPrompt
      css={{ minWidth: '100%' }}
      hasBorder
      layout="horizontal"
      className="eui-fullWidth"
      title={<h2>{title}</h2>}
      body={<p>{body}</p>}
      actions={
        <EuiToolTip content={title}>
          <EuiButton
            color="primary"
            fill
            onClick={onEnable}
            data-test-subj={`enable_entity_store_btn`}
          >
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityStore.enablement.enableButton"
              defaultMessage="Enable"
            />
          </EuiButton>
        </EuiToolTip>
      }
      icon={<EuiImage size="l" hasShadow src={dashboardEnableImg} alt={title} />}
    />
  );
};

export const EntityStoreDashboardPanels = React.memo(EntityStoreDashboardPanelsComponent);
EntityStoreDashboardPanels.displayName = 'EntityStoreDashboardPanels';
