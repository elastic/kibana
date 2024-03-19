/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type {
  GenericValidationResult,
  ActionTypeModel as ConnectorTypeModel,
} from '@kbn/triggers-actions-ui-plugin/public';

import { CASES_CONNECTOR_ID, CASES_CONNECTOR_TITLE } from '../../../../common/constants';
import { CasesSecrets, CasesConfig, CasesActionParams } from './types';
import * as i18n from './translations';

export function getConnectorType(): ConnectorTypeModel<
  CasesConfig,
  CasesSecrets,
  CasesActionParams
> {
  return {
    id: CASES_CONNECTOR_ID,
    iconClass: 'casesApp',
    selectMessage: i18n.CASE_ACTION_DESC,
    actionTypeTitle: CASES_CONNECTOR_TITLE,
    actionConnectorFields: lazy(() => import('./cases_connector')),
    validateParams: async (
      actionParams: CasesActionParams
    ): Promise<GenericValidationResult<unknown>> => {
      return { errors: {} };
      // const translations = await import('./translations');
      // const errors = {
      //   'subActionParams.incident.summary': new Array<string>(),
      //   'subActionParams.incident.labels': new Array<string>(),
      // };
      // const validationResult = {
      //   errors,
      // };
      // if (
      //   actionParams.subActionParams &&
      //   actionParams.subActionParams.incident &&
      //   !actionParams.subActionParams.incident.summary?.length
      // ) {
      //   errors['subActionParams.incident.summary'].push(translations.SUMMARY_REQUIRED);
      // }
      // if (actionParams.subActionParams?.incident?.labels?.length) {
      //   // Jira do not allows empty spaces on labels. If the label includes a whitespace show an error.
      //   if (actionParams.subActionParams.incident.labels.some((label) => label.match(/\s/g)))
      //     errors['subActionParams.incident.labels'].push(translations.LABELS_WHITE_SPACES);
      // }
      // return validationResult;
    },
    actionParamsFields: lazy(() => import('./cases_params')),
  };
}
