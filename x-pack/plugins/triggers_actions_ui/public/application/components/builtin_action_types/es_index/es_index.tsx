/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionTypeModel, ValidationResult } from '../../../../types';
import { EsIndexActionConnector } from '.././types';

const IndexActionConnectorFields = lazy(() => import('./es_index_connector'));
const IndexParamsFields = lazy(() => import('./es_index_params'));

export function getActionType(): ActionTypeModel {
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
    actionConnectorFields: (props: any) => (
      <Suspense fallback={<EuiLoadingSpinner />}>
        <IndexActionConnectorFields {...props} />
      </Suspense>
    ),
    actionParamsFields: (props: any) => (
      <Suspense fallback={<EuiLoadingSpinner />}>
        <IndexParamsFields {...props} />
      </Suspense>
    ),
    validateParams: (): ValidationResult => {
      return { errors: {} };
    },
  };
}
