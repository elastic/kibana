/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ValidationResult,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../triggers_actions_ui/public/types';

import { connector } from './config';
import { createActionType } from '../utils';
import logo from './logo.svg';
import { ServiceNowActionConnector } from './types';
import { ServiceNowConnectorFlyout } from './flyout';
import * as i18n from './translations';

interface Errors {
  username: string[];
  password: string[];
}

const validateConnector = (action: ServiceNowActionConnector): ValidationResult => {
  const errors: Errors = {
    username: [],
    password: [],
  };

  if (!action.secrets.username) {
    errors.username = [...errors.username, i18n.USERNAME_REQUIRED];
  }

  if (!action.secrets.password) {
    errors.password = [...errors.password, i18n.PASSWORD_REQUIRED];
  }

  return { errors };
};

export const getActionType = createActionType({
  id: connector.id,
  iconClass: logo,
  selectMessage: i18n.SERVICENOW_DESC,
  actionTypeTitle: connector.name,
  validateConnector,
  actionConnectorFields: ServiceNowConnectorFlyout,
});
