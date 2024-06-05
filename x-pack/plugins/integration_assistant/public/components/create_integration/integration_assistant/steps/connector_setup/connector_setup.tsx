/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { ConnectorSelectorInline, useLoadConnectors } from '@kbn/elastic-assistant';
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
import { useKibana } from '../../../../../common/hooks/use_kibana';
import * as i18n from './translations';

interface ConnectorSetupProps {
  connectorId: string | undefined;
  setConnectorId: (connectorId: string) => void;
}

export const ConnectorSetup = React.memo<ConnectorSetupProps>(({ connectorId, setConnectorId }) => {
  const { http } = useKibana().services;

  const { data: aiConnectors, isLoading } = useLoadConnectors({ http });
  useEffect(() => {
    // If there is only one connector, set it as the selected connector
    if (aiConnectors != null && aiConnectors.length === 1) {
      setConnectorId(aiConnectors[0].id);
    }
  }, [aiConnectors, setConnectorId]);

  const hasConnectors = aiConnectors != null && aiConnectors.length > 0;

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

      {isLoading ? (
        <EuiFlexItem>
          <EuiLoadingSpinner />
        </EuiFlexItem>
      ) : (
        <>
          <EuiFlexItem grow={false}>
            <EuiText data-test-subj="bodyText" size="s">
              {hasConnectors ? i18n.SELECT_A_CONNECTOR : i18n.SET_UP_A_CONNECTOR}
            </EuiText>
          </EuiFlexItem>
          {hasConnectors ? (
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem>
                  <ConnectorSelectorInline
                    isFlyoutMode={false}
                    onConnectorSelected={noop}
                    onConnectorIdSelected={setConnectorId}
                    selectedConnectorId={connectorId}
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
});
ConnectorSetup.displayName = 'ConnectorSetup';
