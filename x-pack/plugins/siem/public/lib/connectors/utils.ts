/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ActionTypeModel,
  ValidationResult,
  ActionParamsProps,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../triggers_actions_ui/public/types';

import {
  ActionConnector,
  ActionConnectorParams,
  ActionConnectorValidationErrors,
  Optional,
} from './types';
import { isUrlInvalid } from './validators';

import * as i18n from './translations';

export const createActionType = ({
  id,
  actionTypeTitle,
  selectMessage,
  iconClass,
  validateConnector,
  validateParams = connectorParamsValidator,
  actionConnectorFields,
  actionParamsFields = ConnectorParamsFields,
}: Optional<ActionTypeModel, 'validateParams' | 'actionParamsFields'>) => (): ActionTypeModel => {
  return {
    id,
    iconClass,
    selectMessage,
    actionTypeTitle,
    validateConnector: (action: ActionConnector): ValidationResult => {
      const errors: ActionConnectorValidationErrors = {
        apiUrl: [],
      };

      if (!action.config.apiUrl) {
        errors.apiUrl = [...errors.apiUrl, i18n.API_URL_REQUIRED];
      }

      if (isUrlInvalid(action.config.apiUrl)) {
        errors.apiUrl = [...errors.apiUrl, i18n.API_URL_INVALID];
      }

      return { errors: { ...errors, ...validateConnector(action).errors } };
    },
    validateParams,
    actionConnectorFields,
    actionParamsFields,
  };
};

const ConnectorParamsFields: React.FunctionComponent<ActionParamsProps<ActionConnectorParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
}) => {
  return null;
};

const connectorParamsValidator = (actionParams: ActionConnectorParams): ValidationResult => {
  return { errors: {} };
};
