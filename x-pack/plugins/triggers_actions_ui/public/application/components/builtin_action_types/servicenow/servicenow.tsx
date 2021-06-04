/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import {
  GenericValidationResult,
  ActionTypeModel,
  ConnectorValidationResult,
} from '../../../../types';
import {
  ServiceNowActionConnector,
  ServiceNowConfig,
  ServiceNowSecrets,
  ServiceNowITSMActionParams,
  ServiceNowSIRActionParams,
} from './types';
import { isValidUrl } from '../../../lib/value_validators';

const validateConnector = async (
  action: ServiceNowActionConnector
): Promise<ConnectorValidationResult<ServiceNowConfig, ServiceNowSecrets>> => {
  const translations = await import('./translations');
  const configErrors = {
    apiUrl: new Array<string>(),
  };
  const secretsErrors = {
    username: new Array<string>(),
    password: new Array<string>(),
  };

  const validationResult = {
    config: { errors: configErrors },
    secrets: { errors: secretsErrors },
  };

  if (!action.config.apiUrl) {
    configErrors.apiUrl = [...configErrors.apiUrl, translations.API_URL_REQUIRED];
  }

  if (action.config.apiUrl) {
    if (!isValidUrl(action.config.apiUrl)) {
      configErrors.apiUrl = [...configErrors.apiUrl, translations.API_URL_INVALID];
    } else if (!isValidUrl(action.config.apiUrl, 'https:')) {
      configErrors.apiUrl = [...configErrors.apiUrl, translations.API_URL_REQUIRE_HTTPS];
    }
  }

  if (!action.secrets.username) {
    secretsErrors.username = [...secretsErrors.username, translations.USERNAME_REQUIRED];
  }

  if (!action.secrets.password) {
    secretsErrors.password = [...secretsErrors.password, translations.PASSWORD_REQUIRED];
  }

  return validationResult;
};

export const SERVICENOW_ITSM_DESC = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNowITSM.selectMessageText',
  {
    defaultMessage: 'Create an incident in ServiceNow ITSM.',
  }
);

export const SERVICENOW_SIR_DESC = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNowSIR.selectMessageText',
  {
    defaultMessage: 'Create an incident in ServiceNow SecOps.',
  }
);

export const SERVICENOW_ITSM_TITLE = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNowITSM.actionTypeTitle',
  {
    defaultMessage: 'ServiceNow ITSM',
  }
);

export const SERVICENOW_SIR_TITLE = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNowSIR.actionTypeTitle',
  {
    defaultMessage: 'ServiceNow SecOps',
  }
);

export function getServiceNowITSMActionType(): ActionTypeModel<
  ServiceNowConfig,
  ServiceNowSecrets,
  ServiceNowITSMActionParams
> {
  return {
    id: '.servicenow',
    iconClass: lazy(() => import('./logo')),
    selectMessage: SERVICENOW_ITSM_DESC,
    actionTypeTitle: SERVICENOW_ITSM_TITLE,
    validateConnector,
    actionConnectorFields: lazy(() => import('./servicenow_connectors')),
    validateParams: async (
      actionParams: ServiceNowITSMActionParams
    ): Promise<GenericValidationResult<unknown>> => {
      const translations = await import('./translations');
      const errors = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
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
  };
}

export function getServiceNowSIRActionType(): ActionTypeModel<
  ServiceNowConfig,
  ServiceNowSecrets,
  ServiceNowSIRActionParams
> {
  return {
    id: '.servicenow-sir',
    iconClass: lazy(() => import('./logo')),
    selectMessage: SERVICENOW_SIR_DESC,
    actionTypeTitle: SERVICENOW_SIR_TITLE,
    validateConnector,
    actionConnectorFields: lazy(() => import('./servicenow_connectors')),
    validateParams: async (
      actionParams: ServiceNowSIRActionParams
    ): Promise<GenericValidationResult<unknown>> => {
      const translations = await import('./translations');
      const errors = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
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
  };
}
