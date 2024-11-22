/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadAllActions as loadConnectors } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import type { AIConnector } from '@kbn/elastic-assistant/impl/connectorland/connector_selector';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { LocalStorageKey } from '../../../../../constants';
import type { OnboardingCardCheckComplete } from '../../../../../types';
import { AIActionTypeIds } from '../../common/connectors/constants';
import type { AIConnectorCardMetadata } from './types';

const storage = new Storage(localStorage);

export const checkAssistantCardComplete: OnboardingCardCheckComplete<
  AIConnectorCardMetadata
> = async ({ http, application }) => {
  let isComplete = false;
  const allConnectors = await loadConnectors({ http });
  const { capabilities } = application;

  const aiConnectors = allConnectors.reduce((acc: AIConnector[], connector) => {
    if (!connector.isMissingSecrets && AIActionTypeIds.includes(connector.actionTypeId)) {
      acc.push(connector);
    }
    return acc;
  }, []);

  const storedConnectorId = storage.get(LocalStorageKey.siemMigrationsConnectorId);
  if (storedConnectorId) {
    if (aiConnectors.length === 0) {
      storage.remove(LocalStorageKey.siemMigrationsConnectorId);
    } else {
      isComplete = aiConnectors.some((connector) => connector.id === storedConnectorId);
    }
  }

  return {
    isComplete,
    metadata: {
      connectors: aiConnectors,
      canExecuteConnectors: Boolean(capabilities.actions?.show && capabilities.actions?.execute),
      canCreateConnectors: Boolean(capabilities.actions?.save),
    },
  };
};
