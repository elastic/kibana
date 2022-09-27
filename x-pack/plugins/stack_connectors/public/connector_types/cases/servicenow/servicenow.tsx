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
  ServiceNowConfig,
  ServiceNowITOMActionParams,
  ServiceNowITSMActionParams,
  ServiceNowSecrets,
  ServiceNowSIRActionParams,
} from './types';
import { getConnectorDescriptiveTitle, getSelectedConnectorIcon } from './helpers';

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

export const SERVICENOW_ITSM_DESC = i18n.translate(
  'xpack.stackConnectors.components.serviceNowITSM.selectMessageText',
  {
    defaultMessage: 'Create an incident in ServiceNow ITSM.',
  }
);

export const SERVICENOW_SIR_DESC = i18n.translate(
  'xpack.stackConnectors.components.serviceNowSIR.selectMessageText',
  {
    defaultMessage: 'Create an incident in ServiceNow SecOps.',
  }
);

export const SERVICENOW_ITSM_TITLE = i18n.translate(
  'xpack.stackConnectors.components.serviceNowITSM.connectorTypeTitle',
  {
    defaultMessage: 'ServiceNow ITSM',
  }
);

export const SERVICENOW_SIR_TITLE = i18n.translate(
  'xpack.stackConnectors.components.serviceNowSIR.connectorTypeTitle',
  {
    defaultMessage: 'ServiceNow SecOps',
  }
);

export function getServiceNowITSMConnectorType(): ConnectorTypeModel<
  ServiceNowConfig,
  ServiceNowSecrets,
  ServiceNowITSMActionParams
> {
  return {
    id: '.servicenow',
    iconClass: lazy(() => import('./logo')),
    selectMessage: SERVICENOW_ITSM_DESC,
    actionTypeTitle: SERVICENOW_ITSM_TITLE,
    actionConnectorFields: lazy(() => import('./servicenow_connectors')),
    validateParams: async (
      actionParams: ServiceNowITSMActionParams
    ): Promise<GenericValidationResult<unknown>> => {
      const translations = await import('./translations');
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
    actionParamsFields: lazy(() => import('./servicenow_itsm_params')),
    customConnectorSelectItem: {
      getText: getConnectorDescriptiveTitle,
      getComponent: getSelectedConnectorIcon,
    },
  };
}

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
    actionConnectorFields: lazy(() => import('./servicenow_connectors')),
    validateParams: async (
      actionParams: ServiceNowSIRActionParams
    ): Promise<GenericValidationResult<unknown>> => {
      const translations = await import('./translations');
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
    actionConnectorFields: lazy(() => import('./servicenow_connectors_no_app')),
    validateParams: async (
      actionParams: ServiceNowITOMActionParams
    ): Promise<GenericValidationResult<unknown>> => {
      const translations = await import('./translations');
      const errors = {
        severity: new Array<string>(),
      };
      const validationResult = { errors };

      if (actionParams?.subActionParams?.severity == null) {
        errors.severity.push(translations.SEVERITY_REQUIRED);
      }

      return validationResult;
    },
    actionParamsFields: lazy(() => import('./servicenow_itom_params')),
  };
}
