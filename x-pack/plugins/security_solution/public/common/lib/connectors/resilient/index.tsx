/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { lazy } from 'react';
import {
  ValidationResult,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../triggers_actions_ui/public/types';

import { connector } from './config';
import { createActionType } from '../utils';
import logo from './logo.svg';
import { ResilientActionConnector } from './types';
import * as i18n from './translations';

interface Errors {
  orgId: string[];
  apiKeyId: string[];
  apiKeySecret: string[];
}

const validateConnector = (action: ResilientActionConnector): ValidationResult => {
  const errors: Errors = {
    orgId: [],
    apiKeyId: [],
    apiKeySecret: [],
  };

  if (!action.config.orgId) {
    errors.orgId = [...errors.orgId, i18n.RESILIENT_PROJECT_KEY_LABEL];
  }

  if (!action.secrets.apiKeyId) {
    errors.apiKeyId = [...errors.apiKeyId, i18n.RESILIENT_API_KEY_ID_REQUIRED];
  }

  if (!action.secrets.apiKeySecret) {
    errors.apiKeySecret = [...errors.apiKeySecret, i18n.RESILIENT_API_KEY_SECRET_REQUIRED];
  }

  return { errors };
};

export const getActionType = createActionType({
  id: connector.id,
  iconClass: logo,
  selectMessage: i18n.RESILIENT_DESC,
  actionTypeTitle: connector.name,
  validateConnector,
  actionConnectorFields: lazy(() => import('./flyout')),
});
