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
  GenericValidationResult,
  ConnectorValidationResult,
  ALERT_HISTORY_PREFIX,
} from '../../../../types';
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
    validateConnector: async (
      action: EsIndexActionConnector
    ): Promise<ConnectorValidationResult<Pick<EsIndexConfig, 'index'>, unknown>> => {
      const translations = await import('./translations');
      const configErrors = {
        index: new Array<string>(),
      };
      const validationResult = { config: { errors: configErrors }, secrets: { errors: {} } };
      if (!action.config.index) {
        configErrors.index.push(translations.INDEX_REQUIRED);
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./es_index_connector')),
    actionParamsFields: lazy(() => import('./es_index_params')),
    validateParams: async (
      actionParams: IndexActionParams
    ): Promise<GenericValidationResult<IndexActionParams>> => {
      const translations = await import('./translations');
      const errors = {
        documents: new Array<string>(),
        indexOverride: new Array<string>(),
      };
      const validationResult = { errors };
      if (!actionParams.documents?.length || Object.keys(actionParams.documents[0]).length === 0) {
        errors.documents.push(translations.DOCUMENT_NOT_VALID);
      }
      if (actionParams.indexOverride) {
        if (!actionParams.indexOverride.startsWith(ALERT_HISTORY_PREFIX)) {
          errors.indexOverride.push(
            i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.error.badIndexOverrideValue',
              {
                defaultMessage: 'Alert history index must begin with "{alertHistoryPrefix}".',
                values: { alertHistoryPrefix: ALERT_HISTORY_PREFIX },
              }
            )
          );
        }

        const indexSuffix = actionParams.indexOverride.replace(ALERT_HISTORY_PREFIX, '');
        if (indexSuffix.length === 0) {
          errors.indexOverride.push(translations.HISTORY_NOT_VALID);
        }
      }

      return validationResult;
    },
  };
}
