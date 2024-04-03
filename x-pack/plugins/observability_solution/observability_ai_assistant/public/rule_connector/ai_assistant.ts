/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type {
  ActionTypeModel as ConnectorTypeModel,
  GenericValidationResult,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import { ObsAIAssistantActionParams } from './types';

export function getConnectorType(): ConnectorTypeModel<unknown, {}, ObsAIAssistantActionParams> {
  return {
    id: '.observability-ai-assistant',
    modalWidth: 675,
    iconClass: 'logoSlack',
    isSystemActionType: true,
    selectMessage: i18n.translate(
      'xpack.observabilityAiAssistant.alertConnector.selectMessageText',
      {
        defaultMessage: 'Send messages to Observability AI Assistant.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.observabilityAiAssistant.alertConnector.connectorTypeTitle',
      {
        defaultMessage: 'ObsAIAssistant',
      }
    ),
    validateParams: async (
      actionParams: ObsAIAssistantActionParams
    ): Promise<GenericValidationResult<ObsAIAssistantActionParams>> => {
      return { errors: { message: [] } };
    },
    actionConnectorFields: lazy(() => import('./ai_assistant_connectors')),
    actionParamsFields: lazy(() => import('./ai_assistant_params')),
  };
}
