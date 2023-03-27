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
import { ServiceNowSIRActionParams } from './types';
import { getConnectorDescriptiveTitle, getSelectedConnectorIcon } from '../lib/servicenow/helpers';

export const SERVICENOW_SIR_DESC = i18n.translate(
  'xpack.stackConnectors.components.serviceNowSIR.selectMessageText',
  {
    defaultMessage: 'Create an incident in ServiceNow SecOps.',
  }
);

export const SERVICENOW_SIR_TITLE = i18n.translate(
  'xpack.stackConnectors.components.serviceNowSIR.connectorTypeTitle',
  {
    defaultMessage: 'ServiceNow SecOps',
  }
);

export function getServiceNowSIRConnectorType(): ConnectorTypeModel<
  ServiceNowConfig,
  ServiceNowSecrets,
  ServiceNowSIRActionParams
> {
  return {
    id: '.servicenow-sir',
    iconClass: lazy(() => import('./logo')),
    selectMessage: SERVICENOW_SIR_DESC,
    actionTypeTitle: SERVICENOW_SIR_TITLE,
    actionConnectorFields: lazy(() => import('../lib/servicenow/servicenow_connectors')),
    validateParams: async (
      actionParams: ServiceNowSIRActionParams
    ): Promise<GenericValidationResult<unknown>> => {
      const translations = await import('../lib/servicenow/translations');
      const errors = {
        'subActionParams.incident.short_description': new Array<string>(),
      };
      const validationResult = {
        errors,
      };
      if (
        actionParams.subActionParams &&
        actionParams.subActionParams.incident &&
        !actionParams.subActionParams.incident.short_description?.length
      ) {
        errors['subActionParams.incident.short_description'].push(translations.TITLE_REQUIRED);
      }
      return validationResult;
    },
    actionParamsFields: lazy(() => import('./servicenow_sir_params')),
    customConnectorSelectItem: {
      getText: getConnectorDescriptiveTitle,
      getComponent: getSelectedConnectorIcon,
    },
  };
}
