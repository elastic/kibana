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
  CROWDSTRIKE_CONNECTOR_ID,
  CROWDSTRIKE_TITLE,
  SUB_ACTION,
} from '../../../common/crowdstrike/constants';
import type {
  CrowdstrikeConfig,
  CrowdstrikeSecrets,
  CrowdstrikeActionParams,
} from '../../../common/crowdstrike/types';

interface ValidationErrors {
  subAction: string[];
}

export function getConnectorType(): ConnectorTypeModel<
  CrowdstrikeConfig,
  CrowdstrikeSecrets,
  CrowdstrikeActionParams
> {
  return {
    id: CROWDSTRIKE_CONNECTOR_ID,
    actionTypeTitle: CROWDSTRIKE_TITLE,
    iconClass: lazy(() => import('./logo')),
    isExperimental: true,
    selectMessage: i18n.translate(
      'xpack.stackConnectors.security.crowdstrike.config.selectMessageText',
      {
        defaultMessage: 'Execute CrowdStrike scripts',
      }
    ),
    validateParams: async (
      actionParams: CrowdstrikeActionParams
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
    actionConnectorFields: lazy(() => import('./crowdstrike_connector')),
    actionParamsFields: lazy(() => import('./crowdstrike_params_empty')),
    // TODO: Enable once we add support for automated response actions
    // actionParamsFields: lazy(() => import('./crowdstrike_params')),
  };
}
