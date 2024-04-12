/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { GenerativeAIForSearchPlaygroundConnectorFeatureId } from '@kbn/actions-plugin/common';
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
  const handleConnectorCreated = () => {
    refetchConnectors();
    setShowAddedCallout(true);
    setConnectorFlyoutOpen(false);
  };

  return connectors && !isConnectorListLoading ? (
    <>
      {!!connectors.length && showCallout && (
        <EuiCallOut
          title={i18n.translate('xpack.searchPlayground.emptyPrompts.setUpConnector.settled', {
            defaultMessage: '{connectorName} connector added',
            values: {
              connectorName: connectors[0].title,
            },
          })}
          iconType="check"
          color="success"
          data-test-subj="addedConnectorCallout"
        />
      )}
      {!Object.keys(connectors).length && (
        <>
          <StartChatPanel
            title={i18n.translate('xpack.searchPlayground.emptyPrompts.setUpConnector.title', {
              defaultMessage: 'Set up a Gen AI connector',
            })}
            description={
              <FormattedMessage
                id="xpack.searchPlayground.emptyPrompts.setUpConnector.description"
                defaultMessage="A large-language model is required to use a chat bot. Set up a connection to your LLM provider to continue."
              />
            }
          >
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  data-test-subj="setupGenAIConnectorButton"
                  onClick={() => setConnectorFlyoutOpen(true)}
                >
                  <FormattedMessage
                    id="xpack.searchPlayground.emptyPrompts.setUpConnector.btn"
                    defaultMessage="Set up GenAI connector"
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
      )}
    </>
  ) : null;
};
