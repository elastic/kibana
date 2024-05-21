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
import { ServiceNowConfig, ServiceNowSecrets } from '../lib/servicenow/types';
import { ServiceNowITOMActionParams } from './types';

export const SERVICENOW_ITOM_TITLE = i18n.translate(
  'xpack.stackConnectors.components.serviceNowITOM.connectorTypeTitle',
  {
    defaultMessage: 'ServiceNow ITOM',
  }
);

export const SERVICENOW_ITOM_DESC = i18n.translate(
  'xpack.stackConnectors.components.serviceNowITOM.selectMessageText',
  {
    defaultMessage: 'Create an event in ServiceNow ITOM.',
  }
);

export function getServiceNowITOMConnectorType(): ConnectorTypeModel<
  ServiceNowConfig,
  ServiceNowSecrets,
  ServiceNowITOMActionParams
> {
  return {
    id: '.servicenow-itom',
    iconClass: lazy(() => import('./logo')),
    selectMessage: SERVICENOW_ITOM_DESC,
    actionTypeTitle: SERVICENOW_ITOM_TITLE,
    actionConnectorFields: lazy(() => import('../lib/servicenow/servicenow_connectors_no_app')),
    validateParams: async (
      actionParams: ServiceNowITOMActionParams
    ): Promise<GenericValidationResult<unknown>> => {
      const translations = await import('../lib/servicenow/translations');
      const errors = {
        severity: new Array<string>(),
        additional_info: new Array<string>(),
      };

      if (actionParams?.subActionParams?.severity == null) {
        errors.severity.push(translations.SEVERITY_REQUIRED);
      }

      try {
        JSON.parse(actionParams.subActionParams?.additional_info || '{}');
      } catch (error) {
        errors.additional_info.push(translations.ADDITIONAL_INFO_JSON_ERROR);
      }

      return { errors };
    },
    actionParamsFields: lazy(() => import('./servicenow_itom_params')),
  };
}
