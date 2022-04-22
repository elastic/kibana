/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
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
import {
  SERVICENOW_ITOM_DESC,
  SERVICENOW_ITOM_TITLE,
  SERVICENOW_ITSM_DESC,
  SERVICENOW_ITSM_TITLE,
  SERVICENOW_SIR_DESC,
  SERVICENOW_SIR_TITLE,
} from './translations';

const validateConnector = async (
  action: ServiceNowActionConnector
): Promise<ConnectorValidationResult<Omit<ServiceNowConfig, 'isOAuth'>, ServiceNowSecrets>> => {
  const translations = await import('./translations');

  const configErrorsCommon = {
    apiUrl: new Array<string>(),
    usesTableApi: new Array<string>(),
  };

  const configErrorsOAuth = {
    clientId: new Array<string>(),
    userIdentifierValue: new Array<string>(),
    jwtKeyId: new Array<string>(),
  };

  const secretsErrorsBasicAuth = {
    username: new Array<string>(),
    password: new Array<string>(),
  };

  const secretsErrorsOAuth = {
    clientSecret: new Array<string>(),
    privateKey: new Array<string>(),
    privateKeyPassword: new Array<string>(),
  };

  if (!action.config.apiUrl) {
    configErrorsCommon.apiUrl = [...configErrorsCommon.apiUrl, translations.API_URL_REQUIRED];
  }

  if (action.config.apiUrl) {
    if (!isValidUrl(action.config.apiUrl)) {
      configErrorsCommon.apiUrl = [...configErrorsCommon.apiUrl, translations.API_URL_INVALID];
    } else if (!isValidUrl(action.config.apiUrl, 'https:')) {
      configErrorsCommon.apiUrl = [
        ...configErrorsCommon.apiUrl,
        translations.API_URL_REQUIRE_HTTPS,
      ];
    }
  }

  if (action.config.isOAuth) {
    if (!action.config.clientId) {
      configErrorsOAuth.clientId = [...configErrorsOAuth.clientId, translations.CLIENTID_REQUIRED];
    }

    if (!action.config.userIdentifierValue) {
      configErrorsOAuth.userIdentifierValue = [
        ...configErrorsOAuth.userIdentifierValue,
        translations.USER_EMAIL_REQUIRED,
      ];
    }

    if (!action.config.jwtKeyId) {
      configErrorsOAuth.jwtKeyId = [...configErrorsOAuth.jwtKeyId, translations.KEYID_REQUIRED];
    }

    if (!action.secrets.clientSecret) {
      secretsErrorsOAuth.clientSecret = [
        ...secretsErrorsOAuth.clientSecret,
        translations.CLIENTSECRET_REQUIRED,
      ];
    }

    if (!action.secrets.privateKey) {
      secretsErrorsOAuth.privateKey = [
        ...secretsErrorsOAuth.privateKey,
        translations.PRIVATE_KEY_REQUIRED,
      ];
    }

    if (!action.secrets.privateKeyPassword) {
      secretsErrorsOAuth.privateKeyPassword = [
        ...secretsErrorsOAuth.privateKeyPassword,
        translations.PRIVATE_KEY_PASSWORD_REQUIRED,
      ];
    }
  } else {
    if (!action.secrets.username) {
      secretsErrorsBasicAuth.username = [
        ...secretsErrorsBasicAuth.username,
        translations.USERNAME_REQUIRED,
      ];
    }
    if (!action.secrets.password) {
      secretsErrorsBasicAuth.password = [
        ...secretsErrorsBasicAuth.password,
        translations.PASSWORD_REQUIRED,
      ];
    }
  }

  return {
    config: { errors: { ...configErrorsCommon, ...configErrorsOAuth } },
    secrets: { errors: { ...secretsErrorsBasicAuth, ...secretsErrorsOAuth } },
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
