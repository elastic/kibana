/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadAllActions as loadConnectors } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import type { AIConnector } from '@kbn/elastic-assistant/impl/connectorland/connector_selector';
import type { OpenAiProviderType } from '@kbn/stack-connectors-plugin/public/common';
import type { OnboardingCardCheckComplete } from '../../../../types';
import { AllowedActionTypeIds } from './constants';

export const checkAssistantCardComplete: OnboardingCardCheckComplete = async ({ http }) => {
  const aiConnectorsResult = await loadConnectors({ http });

  const reducedAiConnectorsResult = aiConnectorsResult.reduce(
    (acc: AIConnector[], connector) => [
      ...acc,
      ...(!connector.isMissingSecrets && AllowedActionTypeIds.includes(connector.actionTypeId)
        ? [
            {
              ...connector,
              apiProvider:
                !connector.isPreconfigured &&
                !connector.isSystemAction &&
                connector?.config?.apiProvider
                  ? (connector?.config?.apiProvider as OpenAiProviderType)
                  : undefined,
            },
          ]
        : []),
    ],
    []
  );

  const filteredConnectors = reducedAiConnectorsResult.filter(({ actionTypeId }) =>
    AllowedActionTypeIds.includes(actionTypeId)
  );

  return {
    isComplete: filteredConnectors.length > 0,
    metadata: {
      connectors: filteredConnectors,
    },
  };
};
