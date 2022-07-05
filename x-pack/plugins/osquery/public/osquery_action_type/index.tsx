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
import { osqueryActionTypeBase } from '../../common/actions/osquery_type';
import { OsqueryActionParams } from './osquery_action_params_form';

export const getActionType = (): ActionTypeModel => ({
  ...osqueryActionTypeBase,
  // @ts-expect-error update types
  validateParams: (actionParams: OsqueryActionParams): ValidationResult => {
    const validationResult = { errors: {} };
    const errors = {
      message: new Array<string>(),
    };
    validationResult.errors = errors;

    if (actionParams && !actionParams.query) {
      errors.message.push(
        i18n.translate('xpack.osquery.connector.requiredQuery', {
          defaultMessage: 'Query is required.',
        })
      );
    }

    return validationResult;
  },
  actionConnectorFields: lazy(() => import('./osquery_connector_form')),
  actionParamsFields: lazy(() => import('./osquery_action_params_form')),
});
