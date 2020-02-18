/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertTypeModel } from '../../../../../../../triggers_actions_ui/public/types';
import { ExampleExpression } from './expression';
import { validateExampleAlertType } from './validation';

export function getAlertType(): AlertTypeModel {
  return {
    id: 'example',
    name: 'Example Alert Type',
    iconClass: 'bell',
    alertParamsExpression: ExampleExpression,
    validate: validateExampleAlertType,
    defaultActionGroup: 'test',
  };
}
