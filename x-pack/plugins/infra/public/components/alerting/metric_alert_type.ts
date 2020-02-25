/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IFieldType } from 'src/plugins/data/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertTypeModel } from '../../../../triggers_actions_ui/public/types';
import { MetricExpression } from './expression';
import { validateExampleAlertType } from './validation';

export function getAlertType(fields: IFieldType[]): AlertTypeModel {
  return {
    id: 'example',
    name: 'Alert Trigger',
    iconClass: 'bell',
    alertParamsExpression: MetricExpression,
    validate: validateExampleAlertType,
  };
}
