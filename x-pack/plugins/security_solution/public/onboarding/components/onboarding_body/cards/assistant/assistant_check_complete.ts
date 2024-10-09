/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadAllActions as loadConnectors } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import type { AIConnector } from '@kbn/elastic-assistant/impl/connectorland/connector_selector';
import type { OnboardingCardCheckComplete } from '../../../../types';
import { AllowedActionTypeIds } from './constants';
import * as i18n from './translations';

export const checkAssistantCardComplete: OnboardingCardCheckComplete = async ({ http }) => {
  const allConnectors = await loadConnectors({ http });

  const aiConnectors = allConnectors.reduce((acc: AIConnector[], connector) => {
    if (!connector.isMissingSecrets && AllowedActionTypeIds.includes(connector.actionTypeId)) {
      acc.push(connector);
    }
    return acc;
  }, []);

  const completeBadgeText =
    aiConnectors.length === 1
      ? `${aiConnectors.length} ${i18n.ASSISTANT_CARD_CONNECTOR_ADDED}`
      : `${aiConnectors.length} ${i18n.ASSISTANT_CARD_CONNECTORS_ADDED}`;

  return {
    isComplete: aiConnectors.length > 0,
    completeBadgeText,
    metadata: {
      connectors: aiConnectors,
    },
  };
};
