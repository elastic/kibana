/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useLoadConnectors } from '@kbn/elastic-assistant';
import { useConnectorSetup } from '@kbn/elastic-assistant/impl/connectorland/connector_setup';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPopover, EuiLink } from '@elastic/eui';
import { noop } from 'lodash/fp';
import { useKibana } from '../../../use_kibana';
import { StepContentWrapper } from '../step_content_wrapper';
import { ConnectorSelector } from './connector_selector';
import * as i18n from './translations';
import type { AIConnector } from '../../types';

const AllowedActionTypeIds = ['.bedrock', '.openai'];

interface ConnectorStepProps {
  connectorId: string | undefined;
  setConnectorId: (connectorId: string) => void;
}

export const ConnectorStep = React.memo<ConnectorStepProps>(({ connectorId, setConnectorId }) => {
  const { http, notifications } = useKibana().services;
  const [connectors, setConnectors] = useState<AIConnector[]>();
  const { data, isLoading } = useLoadConnectors({ http, toasts: notifications?.toasts });

  useEffect(() => {
    if (data != null) {
      // filter out connectors that are not Bedrock, this is temporary until we have support for openAi
      const aiConnectors = data.filter(({ actionTypeId }) =>
        AllowedActionTypeIds.includes(actionTypeId)
      );
      setConnectors(aiConnectors);

      if (aiConnectors.length === 1) {
        setConnectorId(aiConnectors[0].id);
      }
    }
  }, [data, setConnectorId]);

  // TODO: import an isolated component instead of using this (and remove the ai assistant context dependency)
  const { prompt: connectorPrompt } = useConnectorSetup({
    isFlyoutMode: true, // prevents the "Click to skip" button from showing
    actionTypeIds: AllowedActionTypeIds,
    onConversationUpdate: async () => {},
    onSetupComplete: noop,
    updateConversationsOnSaveConnector: false, // no conversation to update
  });

  const hasConnectors = !isLoading && connectors?.length;

  return (
    <StepContentWrapper
      title={hasConnectors ? i18n.TITLE : i18n.TITLE_NO_CONNECTORS}
      subtitle={hasConnectors ? i18n.DESCRIPTION : i18n.DESCRIPTION_NO_CONNECTORS}
      right={hasConnectors ? <CreateConnectorPopover connectorPrompt={connectorPrompt} /> : null}
    >
      <EuiFlexGroup direction="column" alignItems="stretch">
        <EuiFlexItem>
          {isLoading ? (
            <EuiFlexItem>
              <EuiLoadingSpinner />
            </EuiFlexItem>
          ) : (
            <>
              {hasConnectors ? (
                <EuiFlexItem>
                  <EuiFlexGroup alignItems="stretch" direction="column" gutterSize="s">
                    <ConnectorSelector
                      connectors={connectors}
                      selectedConnectorId={connectorId}
                      setConnectorId={setConnectorId}
                    />
                  </EuiFlexGroup>
                </EuiFlexItem>
              ) : (
                <EuiFlexGroup alignItems="flexStart">
                  <EuiFlexItem grow={false}>{connectorPrompt}</EuiFlexItem>
                </EuiFlexGroup>
              )}
            </>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </StepContentWrapper>
  );
});
ConnectorStep.displayName = 'ConnectorStep';

interface ConnectorSelectorProps {
  connectorPrompt: React.ReactNode;
}
const CreateConnectorPopover = React.memo<ConnectorSelectorProps>(({ connectorPrompt }) => {
  const [isOpen, setIsPopoverOpen] = useState(false);
  const openPopover = useCallback(() => setIsPopoverOpen(true), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  return (
    <EuiPopover
      button={<EuiLink onClick={openPopover}>{i18n.CREATE_CONNECTOR}</EuiLink>}
      isOpen={isOpen}
      closePopover={closePopover}
    >
      <EuiFlexGroup alignItems="flexStart">
        <EuiFlexItem grow={false}>{connectorPrompt}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
});
CreateConnectorPopover.displayName = 'CreateConnectorPopover';
