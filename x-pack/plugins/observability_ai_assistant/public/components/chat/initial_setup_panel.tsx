/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPanel } from '@elastic/eui';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { WelcomeMessage } from './welcome_message';
import { useKnowledgeBase, UseKnowledgeBaseResult } from '../../hooks/use_knowledge_base';
import { useKibana } from '../../hooks/use_kibana';
import type { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';

export function InitialSetupPanel({
  connectors,
}: {
  connectors: UseGenAIConnectorsResult;
  connectorsManagementHref: string;
  knowledgeBase: UseKnowledgeBaseResult;
}) {
  const [connectorFlyoutOpen, setConnectorFlyoutOpen] = useState(false);

  const {
    application: { navigateToApp, capabilities },
    triggersActionsUi: { getAddConnectorFlyout: ConnectorFlyout },
  } = useKibana().services;

  const knowledgeBase = useKnowledgeBase();

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

    if (createdConnector.actionTypeId === '.gen-ai') {
      connectors.reloadConnectors();
    }

    if (!knowledgeBase.status.value) {
      knowledgeBase.install();
    }
  };

  return (
    <>
      <EuiPanel paddingSize="m" style={{ overflowY: 'auto' }}>
        <WelcomeMessage
          setup={!connectors.connectors || connectors.connectors?.length === 0}
          knowledgeBase={knowledgeBase}
          onSetupConnectorClick={handleConnectorClick}
        />
      </EuiPanel>

      {connectorFlyoutOpen ? (
        <ConnectorFlyout
          onClose={() => setConnectorFlyoutOpen(false)}
          onConnectorCreated={onConnectorCreated}
          featureId="generativeAI"
        />
      ) : null}
    </>
  );
}
