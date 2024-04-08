/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import type {
  ActionTypeModel as ConnectorTypeModel,
  GenericValidationResult,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import { ObsAIAssistantActionParams } from './types';
import { ObservabilityAIAssistantService } from '../types';
import { AssistantAvatar } from '../components/assistant_avatar';
import { OBSERVABILITY_AI_ASSISTANT_CONNECTOR_ID } from '../../common/rule_connector';
import {
  CONNECTOR_DESC,
  CONNECTOR_REQUIRED,
  CONNECTOR_TITLE,
  MESSAGE_REQUIRED,
} from './translations';

export function getConnectorType(
  service: ObservabilityAIAssistantService
): ConnectorTypeModel<unknown, {}, ObsAIAssistantActionParams> {
  return {
    id: OBSERVABILITY_AI_ASSISTANT_CONNECTOR_ID,
    modalWidth: 675,
    iconClass: () => <AssistantAvatar />,
    isSystemActionType: true,
    isExperimental: true,
    selectMessage: CONNECTOR_DESC,
    actionTypeTitle: CONNECTOR_TITLE,
    validateParams: async (
      actionParams: ObsAIAssistantActionParams
    ): Promise<GenericValidationResult<ObsAIAssistantActionParams>> => {
      const validationResult = {
        errors: { connector: new Array<string>(), message: new Array<string>() },
      };

      if (!actionParams.connector) {
        validationResult.errors.connector.push(CONNECTOR_REQUIRED);
      }

      if (!actionParams.message) {
        validationResult.errors.message.push(MESSAGE_REQUIRED);
      }

      return validationResult;
    },
    actionParamsFields: lazy(() =>
      import('./ai_assistant_params').then(({ default: ActionParamsFields }) => ({
        default: (props) => <ActionParamsFields {...props} service={service} />,
      }))
    ),
    actionConnectorFields: null,
  };
}
