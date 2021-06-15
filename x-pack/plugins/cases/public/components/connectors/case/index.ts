/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionTypeModel } from '../../../../../triggers_actions_ui/public/types';
import { CaseActionParams } from './types';
import * as i18n from './translations';

interface ValidationResult {
  errors: {
    caseId: string[];
  };
}

const validateParams = (actionParams: CaseActionParams) => {
  const validationResult: ValidationResult = { errors: { caseId: [] } };

  if (actionParams.subActionParams && !actionParams.subActionParams.caseId) {
    validationResult.errors.caseId.push(i18n.CASE_CONNECTOR_CASE_REQUIRED);
  }

  return Promise.resolve(validationResult);
};

export function getActionType(): ActionTypeModel {
  return {
    id: '.case',
    iconClass: 'securityAnalyticsApp',
    selectMessage: i18n.CASE_CONNECTOR_DESC,
    actionTypeTitle: i18n.CASE_CONNECTOR_TITLE,
    validateConnector: () => Promise.resolve({ config: { errors: {} }, secrets: { errors: {} } }),
    validateParams,
    actionConnectorFields: null,
    actionParamsFields: lazy(() => import('./alert_fields')),
  };
}
