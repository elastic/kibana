/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useLoadConnectors } from '@kbn/elastic-assistant';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPopover, EuiLink } from '@elastic/eui';
import { useKibana } from '../../../../../common/hooks/use_kibana';
import { StepContentWrapper } from '../step_content_wrapper';
import { ConnectorSelector } from './connector_selector';
import { ConnectorSetup } from './connector_setup';
import type { AIConnector } from '../../types';
import { useActions } from '../../state';
import * as i18n from './translations';

/**
 * List of allowed action type IDs for the integrations assistant.
 * Replace by ['.bedrock', '.gen-ai'] to allow OpenAI connectors.
 */
const AllowedActionTypeIds = ['.bedrock'];

interface ConnectorStepProps {
  connectorId: string | undefined;
}
export const ConnectorStep = React.memo<ConnectorStepProps>(({ connectorId }) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const { setConnectorId } = useActions();
  const [connectors, setConnectors] = useState<AIConnector[]>();
  const {
    isLoading,
    data: aiConnectors,
    refetch: refetchConnectors,
  } = useLoadConnectors({ http, toasts });

  useEffect(() => {
    if (aiConnectors != null) {
      // filter out connectors, this is temporary until we add support for more models
      const filteredAiConnectors = aiConnectors.filter(({ actionTypeId }) =>
        AllowedActionTypeIds.includes(actionTypeId)
      );
      setConnectors(filteredAiConnectors);
      if (filteredAiConnectors && filteredAiConnectors.length === 1) {
        // pre-select the connector if there is only one
        setConnectorId(filteredAiConnectors[0].id);
      }
    }
  }, [aiConnectors, setConnectorId]);

  const onConnectorSaved = useCallback(() => refetchConnectors(), [refetchConnectors]);

  const hasConnectors = !isLoading && connectors?.length;

  return (
    <StepContentWrapper
      title={i18n.TITLE}
      subtitle={i18n.DESCRIPTION}
      right={hasConnectors ? <CreateConnectorPopover onConnectorSaved={onConnectorSaved} /> : null}
    >
      <EuiFlexGroup direction="column" alignItems="stretch">
        <EuiFlexItem>
          {isLoading ? (
            <EuiLoadingSpinner />
          ) : (
            <>
              {hasConnectors ? (
                <EuiFlexGroup alignItems="stretch" direction="column" gutterSize="s">
                  <ConnectorSelector connectors={connectors} selectedConnectorId={connectorId} />
                </EuiFlexGroup>
              ) : (
                <ConnectorSetup
                  actionTypeIds={AllowedActionTypeIds}
                  onConnectorSaved={onConnectorSaved}
                />
              )}
            </>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </StepContentWrapper>
  );
});
ConnectorStep.displayName = 'ConnectorStep';

interface CreateConnectorPopoverProps {
  onConnectorSaved: () => void;
}
const CreateConnectorPopover = React.memo<CreateConnectorPopoverProps>(({ onConnectorSaved }) => {
  const [isOpen, setIsPopoverOpen] = useState(false);
  const openPopover = useCallback(() => setIsPopoverOpen(true), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const onConnectorSavedAndClose = useCallback(() => {
    onConnectorSaved();
    closePopover();
  }, [onConnectorSaved, closePopover]);

  return (
    <EuiPopover
      button={<EuiLink onClick={openPopover}>{i18n.CREATE_CONNECTOR}</EuiLink>}
      isOpen={isOpen}
      closePopover={closePopover}
    >
      <EuiFlexGroup alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <ConnectorSetup
            actionTypeIds={AllowedActionTypeIds}
            onConnectorSaved={onConnectorSavedAndClose}
            onClose={closePopover}
            compressed
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
});
CreateConnectorPopover.displayName = 'CreateConnectorPopover';
