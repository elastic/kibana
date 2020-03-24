/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AlertTypeModel } from '../../../../types';
import { IndexThresholdAlertTypeExpression } from './expression';
import { validateExpression } from './validation';

export function getAlertType(): AlertTypeModel {
  return {
    id: '.index-threshold',
    name: 'Index threshold',
    iconClass: 'alert',
    alertParamsExpression: IndexThresholdAlertTypeExpression,
    validate: validateExpression,
  };
}
