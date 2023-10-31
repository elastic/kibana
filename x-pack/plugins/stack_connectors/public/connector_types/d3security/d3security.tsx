/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { GenericValidationResult } from '@kbn/triggers-actions-ui-plugin/public/types';
import { SUB_ACTION } from '../../../common/d3security/constants';
import { D3SecurityActionParams, D3SecurityConnector } from './types';
import { D3_SECURITY_CONNECTOR_ID } from '../../../common/d3security/constants';
interface ValidationErrors {
  subAction: string[];
  body: string[];
}
export function getConnectorType(): D3SecurityConnector {
  return {
    id: D3_SECURITY_CONNECTOR_ID,
    iconClass: lazy(() => import('./logo')),
    selectMessage: i18n.translate('xpack.stackConnectors.components.d3security.selectMessageText', {
      defaultMessage: 'Create event or trigger playbook workflow actions in D3 SOAR.',
    }),
    actionTypeTitle: i18n.translate(
      'xpack.stackConnectors.components.d3security.connectorTypeTitle',
      {
        defaultMessage: 'D3 data',
      }
    ),
    validateParams: async (
      actionParams: D3SecurityActionParams
    ): Promise<GenericValidationResult<ValidationErrors>> => {
      const errors: ValidationErrors = {
        body: [],
        subAction: [],
      };
      const { subAction, subActionParams } = actionParams;
      const translations = await import('./translations');

      if (!subActionParams.body?.length) {
        errors.body.push(translations.BODY_REQUIRED);
      }
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
