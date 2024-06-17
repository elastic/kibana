/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { GenerativeAIForSearchPlaygroundConnectorFeatureId } from '@kbn/actions-plugin/common';
import { AnalyticsEvents } from '../analytics/constants';
import { useUsageTracker } from '../hooks/use_usage_tracker';
import { useKibana } from '../hooks/use_kibana';
import { useLoadConnectors } from '../hooks/use_load_connectors';
import { StartChatPanel } from './start_chat_panel';

export const SetUpConnectorPanelForStartChat: React.FC = () => {
  const [connectorFlyoutOpen, setConnectorFlyoutOpen] = useState(false);
  const [showCallout, setShowAddedCallout] = useState(false);
  const {
    services: {
      triggersActionsUi: { getAddConnectorFlyout: ConnectorFlyout },
    },
  } = useKibana();
  const {
    data: connectors,
    refetch: refetchConnectors,
    isLoading: isConnectorListLoading,
  } = useLoadConnectors();
  const usageTracker = useUsageTracker();
  const handleConnectorCreated = () => {
    refetchConnectors();
    setShowAddedCallout(true);
    setConnectorFlyoutOpen(false);
  };
  const handleSetupGenAiConnector = () => {
    usageTracker?.click(AnalyticsEvents.genAiConnectorCreated);
    setConnectorFlyoutOpen(true);
  };

  useEffect(() => {
    if (connectors?.length) {
      if (showCallout) {
        usageTracker?.load(AnalyticsEvents.genAiConnectorAdded);
      } else {
        usageTracker?.load(AnalyticsEvents.genAiConnectorExists);
      }
    } else {
      usageTracker?.load(AnalyticsEvents.genAiConnectorSetup);
    }
  }, [connectors?.length, showCallout, usageTracker]);

  if (isConnectorListLoading) {
    return null;
  }

  return connectors?.length ? (
    showCallout ? (
      <EuiCallOut
        title={i18n.translate('xpack.searchPlayground.emptyPrompts.setUpConnector.settled', {
          defaultMessage: '{connectorName} connector added',
          values: {
            connectorName: connectors![0].title,
          },
        })}
        iconType="check"
        color="success"
        data-test-subj="addedConnectorCallout"
      />
    ) : null
  ) : (
    <>
      <StartChatPanel
        title={i18n.translate('xpack.searchPlayground.emptyPrompts.setUpConnector.title', {
          defaultMessage: 'Connect to LLM',
        })}
        description={
          <FormattedMessage
            id="xpack.searchPlayground.emptyPrompts.setUpConnector.description"
            defaultMessage="You need to connect to a large-language model to use this feature. Start by adding connection details for your LLM provider."
          />
        }
        dataTestSubj="connectToLLMChatPanel"
      >
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              color="primary"
              data-test-subj="setupGenAIConnectorButton"
              onClick={handleSetupGenAiConnector}
            >
              <FormattedMessage
                id="xpack.searchPlayground.emptyPrompts.setUpConnector.btn"
                defaultMessage="Connect"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </StartChatPanel>
      {connectorFlyoutOpen && (
        <ConnectorFlyout
          featureId={GenerativeAIForSearchPlaygroundConnectorFeatureId}
          onConnectorCreated={handleConnectorCreated}
          onClose={() => setConnectorFlyoutOpen(false)}
        />
      )}
    </>
  );
};
