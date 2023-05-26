/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import {
  ActionTypeModel as ConnectorTypeModel,
  GenericValidationResult,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import { D3ActionParams, D3Config, D3Secrets } from '../types';

export function getConnectorType(): ConnectorTypeModel<D3Config, D3Secrets, D3ActionParams> {
  return {
    id: '.d3security',
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
      actionParams: D3ActionParams
    ): Promise<GenericValidationResult<D3ActionParams>> => {
      const translations = await import('./translations');
      const errors = {
        body: new Array<string>(),
        severity: new Array<string>(),
        eventType: new Array<string>(),
      };
      const validationResult = { errors };
      validationResult.errors = errors;
      if (!actionParams.body?.length) {
        errors.body.push(translations.BODY_REQUIRED);
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./d3security_connectors')),
    actionParamsFields: lazy(() => import('./d3security_params')),
  };
}
