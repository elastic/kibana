/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type { GenericValidationResult } from '@kbn/triggers-actions-ui-plugin/public/types';
import { SUB_ACTION } from '../../../common/bedrock/constants';
import { BEDROCK_CONNECTOR_ID, BEDROCK_TITLE } from '../../../common/bedrock/constants';
import { BedrockActionParams, BedrockConnector } from './types';

interface ValidationErrors {
  subAction: string[];
  body: string[];
}
export function getConnectorType(): BedrockConnector {
  return {
    id: BEDROCK_CONNECTOR_ID,
    iconClass: lazy(() => import('./logo')),
    selectMessage: i18n.translate('xpack.stackConnectors.components.bedrock.selectMessageText', {
      defaultMessage: 'Send a request to Amazon Bedrock.',
    }),
    actionTypeTitle: BEDROCK_TITLE,
    validateParams: async (
      actionParams: BedrockActionParams
    ): Promise<GenericValidationResult<ValidationErrors>> => {
      const { subAction, subActionParams } = actionParams;
      const translations = await import('./translations');
      const errors: ValidationErrors = {
        body: [],
        subAction: [],
      };

      if (subAction === SUB_ACTION.TEST || subAction === SUB_ACTION.RUN) {
        if (!subActionParams.body?.length) {
          errors.body.push(translations.BODY_REQUIRED);
        } else {
          try {
            JSON.parse(subActionParams.body);
          } catch {
            errors.body.push(translations.BODY_INVALID);
          }
        }
      }
      if (errors.body.length) return { errors };

      // The internal "subAction" param should always be valid, ensure it is only if "subActionParams" are valid
      if (!subAction) {
        errors.subAction.push(translations.ACTION_REQUIRED);
      } else if (subAction !== SUB_ACTION.RUN && subAction !== SUB_ACTION.TEST) {
        errors.subAction.push(translations.INVALID_ACTION);
      }
      return { errors };
    },
    actionConnectorFields: lazy(() => import('./connector')),
    actionParamsFields: lazy(() => import('./params')),
  };
}
