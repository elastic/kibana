/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
  COLOR_MODES_STANDARD,
} from '@elastic/eui';
import { useKibana } from '../../../../../../common/lib/kibana/kibana_react';
import { useDefinedLocalStorage } from '../../../../hooks/use_stored_state';
import type { OnboardingCardComponent } from '../../../../../types';
import * as i18n from './translations';
import { OnboardingCardContentPanel } from '../../common/card_content_panel';
import { ConnectorCards } from '../../common/connectors/connector_cards';
import type { AIConnectorCardMetadata } from './types';
import { MissingPrivilegesCallOut } from '../../common/connectors/missing_privileges';

export const AIConnectorCard: OnboardingCardComponent<AIConnectorCardMetadata> = ({
  checkCompleteMetadata,
  checkComplete,
  setComplete,
}) => {
  const { siemMigrations } = useKibana().services;
  const { colorMode } = useEuiTheme();
  const isDarkMode = colorMode === COLOR_MODES_STANDARD.dark;

  const [storedConnectorId, setStoredConnectorId] = useDefinedLocalStorage<string | null>(
    siemMigrations.rules.connectorIdStorage.key,
    null
  );
  const setSelectedConnectorId = useCallback(
    (connectorId: string) => {
      setStoredConnectorId(connectorId);
      setComplete(true);
    },
    [setComplete, setStoredConnectorId]
  );

  const connectors = checkCompleteMetadata?.connectors;
  const canExecuteConnectors = checkCompleteMetadata?.canExecuteConnectors;
  const canCreateConnectors = checkCompleteMetadata?.canCreateConnectors;

  return (
    <OnboardingCardContentPanel>
      {canExecuteConnectors ? (
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiText size="s" color={isDarkMode ? 'text' : 'subdued'}>
              {i18n.AI_CONNECTOR_CARD_DESCRIPTION}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <ConnectorCards
              canCreateConnectors={canCreateConnectors}
              connectors={connectors}
              onConnectorSaved={checkComplete}
              selectedConnectorId={storedConnectorId}
              setSelectedConnectorId={setSelectedConnectorId}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <MissingPrivilegesCallOut />
      )}
    </OnboardingCardContentPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default AIConnectorCard;
