/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConnectorSelectorInline } from '@kbn/elastic-assistant';
import { useConnectorSetup } from '@kbn/elastic-assistant/impl/connectorland/connector_setup';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { noop } from 'lodash/fp';

import * as i18n from './translations';

interface ConnectorSetupProps {
  isLoadingConnectors: boolean;
  selectedConnectorId: string | undefined;
  onConnectorIdSelected: (connectorId: string) => void;
}

export const ConnectorSetup = React.memo<ConnectorSetupProps>(
  ({ isLoadingConnectors, selectedConnectorId, onConnectorIdSelected }) => {
    const { prompt: connectorPrompt } = useConnectorSetup({
      isFlyoutMode: true, // prevents the "Click to skip" button from showing
      onConversationUpdate: async () => {},
      onSetupComplete: noop, // this callback cannot be used to select a connector, so it's not used
      updateConversationsOnSaveConnector: false, // no conversation to update
    });

    return (
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h6>{i18n.CONNECTOR_SETUP_TITLE}</h6>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText data-test-subj="bodyText" size="s">
            {i18n.CONNECTOR_SETUP_DESCRIPTION}
          </EuiText>
          <EuiSpacer size="m" />
        </EuiFlexItem>

        {isLoadingConnectors ? (
          <EuiFlexItem>
            <EuiLoadingSpinner />
          </EuiFlexItem>
        ) : (
          <>
            <EuiFlexItem grow={false}>
              <EuiText data-test-subj="bodyText" size="s">
                {selectedConnectorId ? i18n.SELECT_A_CONNECTOR : i18n.SET_UP_A_CONNECTOR}
              </EuiText>
            </EuiFlexItem>
            {selectedConnectorId ? (
              <EuiFlexItem>
                <EuiFlexGroup alignItems="center">
                  <EuiFlexItem>
                    <ConnectorSelectorInline
                      isFlyoutMode={false}
                      onConnectorSelected={noop}
                      onConnectorIdSelected={onConnectorIdSelected}
                      selectedConnectorId={selectedConnectorId}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            ) : (
              <EuiFlexGroup alignItems="flexStart">
                <EuiFlexItem grow={false}>{connectorPrompt}</EuiFlexItem>
              </EuiFlexGroup>
            )}
          </>
        )}
      </EuiFlexGroup>
    );
  }
);
ConnectorSetup.displayName = 'ConnectorSetup';
