/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadAllActions as loadConnectors } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import type { AIConnector } from '@kbn/elastic-assistant/impl/connectorland/connector_selector';
import { i18n } from '@kbn/i18n';
import type { OnboardingCardCheckComplete } from '../../../../types';
import { AllowedActionTypeIds } from './constants';
import type { AssistantCardMetadata } from './types';

export const checkAssistantCardComplete: OnboardingCardCheckComplete<
  AssistantCardMetadata
> = async ({ http, application }) => {
  const allConnectors = await loadConnectors({ http });
  const {
    capabilities: { actions },
  } = application;

  const aiConnectors = allConnectors.reduce((acc: AIConnector[], connector) => {
    if (!connector.isMissingSecrets && AllowedActionTypeIds.includes(connector.actionTypeId)) {
      acc.push(connector);
    }
    return acc;
  }, []);

  const completeBadgeText = i18n.translate(
    'xpack.securitySolution.onboarding.assistantCard.badge.completeText',
    {
      defaultMessage: '{count} AI {count, plural, one {connector} other {connectors}} added',
      values: { count: aiConnectors.length },
    }
  );

  return {
    isComplete: aiConnectors.length > 0,
    completeBadgeText,
    metadata: {
      connectors: aiConnectors,
      canExecuteConnectors: Boolean(actions?.show && actions?.execute),
      canCreateConnectors: Boolean(actions?.save),
    },
  };
};
