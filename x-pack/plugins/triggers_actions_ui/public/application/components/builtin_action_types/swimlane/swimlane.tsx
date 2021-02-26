/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { lazy } from 'react';
import { ActionTypeModel, ValidationResult } from '../../../../types';
import {
  SwimlaneActionConnector,
  SwimlaneConfig,
  SwimlaneSecrets,
  SwimlaneActionParams,
} from './types';
import swimlaneSvg from './swimlane.svg';
import * as i18n from './translations';

export function getActionType(): ActionTypeModel<
  SwimlaneConfig,
  SwimlaneSecrets,
  SwimlaneActionParams
> {
  return {
    id: '.swimlane',
    iconClass: swimlaneSvg,
    selectMessage: i18n.SW_SELECT_MESSAGE_TEXT,
    actionTypeTitle: i18n.SW_ACTION_TYPE_TITLE,
    validateConnector: (action: SwimlaneActionConnector): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        apiUrl: new Array<string>(),
        appId: new Array<string>(),
        apiToken: new Array<string>(),
        mappings: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!action.secrets.apiToken) {
        errors.apiToken.push(i18n.SW_REQUIRED_API_TOKEN_TEXT);
      }
      if (!action.config.appId) {
        errors.appId.push(i18n.SW_REQUIRED_APP_ID_TEXT);
      }
      if (!action.config.mappings) {
        errors.mappings.push(i18n.SW_REQUIRED_FIELD_MAPPINGS_TEXT);
      }
      return validationResult;
    },
    validateParams: (actionParams: SwimlaneActionParams): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        alertName: new Array<string>(),
        caseId: new Array<string>(),
        severity: new Array<string>(),
        caseName: new Array<string>(),
        alertSource: new Array<string>(),
        comments: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!actionParams.subActionParams.alertName?.length) {
        errors.alertName.push(i18n.SW_REQUIRED_ALERT_NAME);
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./swimlane_connectors')),
    actionParamsFields: lazy(() => import('./swimlane_params')),
  };
}
