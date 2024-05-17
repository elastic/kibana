/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, useCurrentEuiBreakpoint } from '@elastic/eui';
import { css } from '@emotion/css';
import { GenerativeAIForObservabilityConnectorFeatureId } from '@kbn/actions-plugin/common';
import { isSupportedConnectorType } from '@kbn/observability-ai-assistant-plugin/public';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import React, { useState } from 'react';
import type { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';
import { useKibana } from '../../hooks/use_kibana';
import type { UseKnowledgeBaseResult } from '../../hooks/use_knowledge_base';
import { Disclaimer } from './disclaimer';
import { StarterPrompts } from './starter_prompts';
import { WelcomeMessageConnectors } from './welcome_message_connectors';
import { WelcomeMessageKnowledgeBase } from './welcome_message_knowledge_base';

const fullHeightClassName = css`
  height: 100%;
`;

const centerMaxWidthClassName = css`
  max-width: 600px;
  text-align: center;
`;

export function WelcomeMessage({
  connectors,
  knowledgeBase,
  onSelectPrompt,
}: {
  connectors: UseGenAIConnectorsResult;
  knowledgeBase: UseKnowledgeBaseResult;
  onSelectPrompt: (prompt: string) => void;
}) {
  const breakpoint = useCurrentEuiBreakpoint();

  const {
    application: { navigateToApp, capabilities },
    plugins: {
      start: {
        triggersActionsUi: { getAddConnectorFlyout: ConnectorFlyout },
      },
    },
  } = useKibana().services;

  const [connectorFlyoutOpen, setConnectorFlyoutOpen] = useState(false);

  const handleConnectorClick = () => {
    if (capabilities.management?.insightsAndAlerting?.triggersActions) {
      setConnectorFlyoutOpen(true);
    } else {
      navigateToApp('management', {
        path: '/insightsAndAlerting/triggersActionsConnectors/connectors',
      });
    }
  };

  const onConnectorCreated = (createdConnector: ActionConnector) => {
    setConnectorFlyoutOpen(false);

    if (isSupportedConnectorType(createdConnector.actionTypeId)) {
      connectors.reloadConnectors();
    }

    if (!knowledgeBase.status.value || knowledgeBase.status.value?.ready === false) {
      knowledgeBase.install();
    }
  };

  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        direction="column"
        gutterSize="none"
        className={fullHeightClassName}
      >
        <EuiFlexItem grow className={centerMaxWidthClassName}>
          <EuiSpacer size={['xl', 'l'].includes(breakpoint!) ? 'l' : 's'} />

          <WelcomeMessageConnectors
            connectors={connectors}
            onSetupConnectorClick={handleConnectorClick}
          />

          <WelcomeMessageKnowledgeBase connectors={connectors} knowledgeBase={knowledgeBase} />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <StarterPrompts onSelectPrompt={onSelectPrompt} />

          <EuiSpacer size="l" />
          <Disclaimer />
        </EuiFlexItem>
      </EuiFlexGroup>

      {connectorFlyoutOpen ? (
        <ConnectorFlyout
          featureId={GenerativeAIForObservabilityConnectorFeatureId}
          onConnectorCreated={onConnectorCreated}
          onClose={() => setConnectorFlyoutOpen(false)}
        />
      ) : null}
    </>
  );
}
