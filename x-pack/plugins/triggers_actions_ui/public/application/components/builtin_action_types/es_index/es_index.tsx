/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { ActionTypeModel, ValidationResult } from '../../../../types';
import { EsIndexActionConnector, EsIndexConfig, IndexActionParams } from '../types';

export function getActionType(): ActionTypeModel<EsIndexConfig, unknown, IndexActionParams> {
  return {
    id: '.index',
    iconClass: 'indexOpen',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.selectMessageText',
      {
        defaultMessage: 'Index data into Elasticsearch.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.actionTypeTitle',
      {
        defaultMessage: 'Index data',
      }
    ),
    validateConnector: (action: EsIndexActionConnector): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        index: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!action.config.index) {
        errors.index.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.error.requiredIndexText',
            {
              defaultMessage: 'Index is required.',
            }
          )
        );
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./es_index_connector')),
    actionParamsFields: lazy(() => import('./es_index_params')),
    validateParams: (actionParams: IndexActionParams): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        documents: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!actionParams.documents?.length || Object.keys(actionParams.documents[0]).length === 0) {
        errors.documents.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredDocumentJson',
            {
              defaultMessage: 'Document is required and should be a valid JSON object.',
            }
          )
        );
      }
      return validationResult;
    },
  };
}
