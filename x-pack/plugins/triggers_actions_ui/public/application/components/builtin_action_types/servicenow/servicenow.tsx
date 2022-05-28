/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import {
  ActionTypeModel,
  ConnectorValidationResult,
  GenericValidationResult,
} from '../../../../types';
import {
  ServiceNowActionConnector,
  ServiceNowConfig,
  ServiceNowITOMActionParams,
  ServiceNowITSMActionParams,
  ServiceNowSecrets,
  ServiceNowSIRActionParams,
} from './types';
import { isValidUrl } from '../../../lib/value_validators';
import { getConnectorDescriptiveTitle, getSelectedConnectorIcon } from './helpers';

export const SERVICENOW_ITOM_TITLE = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNowITOM.actionTypeTitle',
  {
    defaultMessage: 'ServiceNow ITOM',
  }
);

export const SERVICENOW_ITOM_DESC = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNowITOM.selectMessageText',
  {
    defaultMessage: 'Create an event in ServiceNow ITOM.',
  }
);

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

const validateConnector = async (
  action: ServiceNowActionConnector
): Promise<
  ConnectorValidationResult<
    Omit<ServiceNowConfig, 'isOAuth'>,
    Omit<ServiceNowSecrets, 'privateKeyPassword'>
  >
> => {
  const translations = await import('./translations');

  const configErrors = {
    apiUrl: new Array<string>(),
    usesTableApi: new Array<string>(),
    clientId: new Array<string>(),
    userIdentifierValue: new Array<string>(),
    jwtKeyId: new Array<string>(),
  };

  const secretsErrors = {
    username: new Array<string>(),
    password: new Array<string>(),
    clientSecret: new Array<string>(),
    privateKey: new Array<string>(),
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

  if (action.config.isOAuth) {
    if (!action.config.clientId) {
      configErrors.clientId = [...configErrors.clientId, translations.CLIENTID_REQUIRED];
    }

    if (!action.config.userIdentifierValue) {
      configErrors.userIdentifierValue = [
        ...configErrors.userIdentifierValue,
        translations.USER_EMAIL_REQUIRED,
      ];
    }

    if (!action.config.jwtKeyId) {
      configErrors.jwtKeyId = [...configErrors.jwtKeyId, translations.KEYID_REQUIRED];
    }

    if (!action.secrets.clientSecret) {
      secretsErrors.clientSecret = [
        ...secretsErrors.clientSecret,
        translations.CLIENTSECRET_REQUIRED,
      ];
    }

    if (!action.secrets.privateKey) {
      secretsErrors.privateKey = [...secretsErrors.privateKey, translations.PRIVATE_KEY_REQUIRED];
    }
  } else {
    if (!action.secrets.username) {
      secretsErrors.username = [...secretsErrors.username, translations.USERNAME_REQUIRED];
    }
    if (!action.secrets.password) {
      secretsErrors.password = [...secretsErrors.password, translations.PASSWORD_REQUIRED];
    }
  }

  return {
    config: { errors: configErrors },
    secrets: { errors: secretsErrors },
  };
};

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

export function getServiceNowITOMActionType(): ActionTypeModel<
  ServiceNowConfig,
  ServiceNowSecrets,
  ServiceNowITOMActionParams
> {
  return {
    id: '.servicenow-itom',
    iconClass: lazy(() => import('./logo')),
    selectMessage: SERVICENOW_ITOM_DESC,
    actionTypeTitle: SERVICENOW_ITOM_TITLE,
    validateConnector,
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
