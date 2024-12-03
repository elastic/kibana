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
} from '@kbn/triggers-actions-ui-plugin/public';
import {
  SENTINELONE_CONNECTOR_ID,
  SENTINELONE_TITLE,
  SUB_ACTION,
} from '../../../common/sentinelone/constants';
import type {
  SentinelOneConfig,
  SentinelOneSecrets,
  SentinelOneActionParams,
} from '../../../common/sentinelone/types';

interface ValidationErrors {
  subAction: string[];
}

export function getConnectorType(): ConnectorTypeModel<
  SentinelOneConfig,
  SentinelOneSecrets,
  SentinelOneActionParams
> {
  return {
    id: SENTINELONE_CONNECTOR_ID,
    actionTypeTitle: SENTINELONE_TITLE,
    iconClass: lazy(() => import('./logo')),
    isExperimental: true,
    selectMessage: i18n.translate(
      'xpack.stackConnectors.security.sentinelone.config.selectMessageText',
      {
        defaultMessage: 'Execute SentinelOne scripts',
      }
    ),
    validateParams: async (
      actionParams: SentinelOneActionParams
    ): Promise<GenericValidationResult<ValidationErrors>> => {
      const translations = await import('./translations');
      const errors: ValidationErrors = {
        subAction: [],
      };
      const { subAction } = actionParams;

      // The internal "subAction" param should always be valid, ensure it is only if "subActionParams" are valid
      if (!subAction) {
        errors.subAction.push(translations.ACTION_REQUIRED);
      } else if (!Object.values(SUB_ACTION).includes(subAction)) {
        errors.subAction.push(translations.INVALID_ACTION);
      }
      return { errors };
    },
    actionConnectorFields: lazy(() => import('./sentinelone_connector')),
    actionParamsFields: lazy(() => import('./sentinelone_params_empty')),
  };
}
