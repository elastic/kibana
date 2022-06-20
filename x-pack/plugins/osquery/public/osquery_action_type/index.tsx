/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionTypeModel, ValidationResult } from '@kbn/triggers-actions-ui-plugin/public/types';
import { OsqueryActionParams } from './osquery_connector_form';

export const getActionType = (): ActionTypeModel => ({
  id: '.osquery',
  iconClass: 'logoOsquery',
  selectMessage: i18n.translate('xpack.osquery.connector.selectActionText', {
    defaultMessage: 'Example Action is used to show how to create new action type UI.',
  }),
  actionTypeTitle: i18n.translate('xpack.osquery.connector.actionTypeTitle', {
    defaultMessage: 'Example Action',
  }),
  // @ts-expect-error update types
  validateParams: (actionParams: OsqueryActionParams): ValidationResult => {
    const validationResult = { errors: {} };
    const errors = {
      message: new Array<string>(),
    };
    validationResult.errors = errors;

    if (actionParams.message && !actionParams.message.query) {
      errors.message.push(
        i18n.translate('xpack.osquery.connector.requiredQuery', {
          defaultMessage: 'Query is required.',
        })
      );
    }

    return validationResult;
  },
  actionConnectorFields: null,
  actionParamsFields: lazy(() => import('./osquery_connector_form')),
});
