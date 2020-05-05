/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { lazy } from 'react';
import {
  ActionTypeModel,
  ValidationResult,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../triggers_actions_ui/public/types';

import * as i18n from './translations';

import { ServiceNowActionConnector } from './types';
import { isUrlInvalid } from './validators';

import { connectors } from './config';

const serviceNowDefinition = connectors['.servicenow'];

export interface ServiceNowActionParams {
  message: string;
}

interface Errors {
  apiUrl: string[];
  username: string[];
  password: string[];
}

export function getActionType(): ActionTypeModel {
  return {
    id: serviceNowDefinition.actionTypeId,
    iconClass: serviceNowDefinition.logo,
    selectMessage: i18n.SERVICENOW_DESC,
    actionTypeTitle: i18n.SERVICENOW_TITLE,
    validateConnector: (action: ServiceNowActionConnector): ValidationResult => {
      const errors: Errors = {
        apiUrl: [],
        username: [],
        password: [],
      };

      if (!action.config.apiUrl) {
        errors.apiUrl = [...errors.apiUrl, i18n.SERVICENOW_API_URL_REQUIRED];
      }

      if (isUrlInvalid(action.config.apiUrl)) {
        errors.apiUrl = [...errors.apiUrl, i18n.SERVICENOW_API_URL_INVALID];
      }

      if (!action.secrets.username) {
        errors.username = [...errors.username, i18n.SERVICENOW_USERNAME_REQUIRED];
      }

      if (!action.secrets.password) {
        errors.password = [...errors.password, i18n.SERVICENOW_PASSWORD_REQUIRED];
      }

      return { errors };
    },
    validateParams: (actionParams: ServiceNowActionParams): ValidationResult => {
      return { errors: {} };
    },
    actionConnectorFields: lazy(() => import('./servicenow_connectors')),
    actionParamsFields: lazy(() => import('./servicenow_params')),
  };
}
