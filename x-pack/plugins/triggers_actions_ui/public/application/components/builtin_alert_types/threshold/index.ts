/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { lazy } from 'react';

import { AlertTypeModel } from '../../../../types';
import { validateExpression } from './validation';
import { IndexThresholdAlertParams } from './types';
import { AlertsContextValue } from '../../../context/alerts_context';

export function getAlertType(): AlertTypeModel<IndexThresholdAlertParams, AlertsContextValue> {
  return {
    id: '.index-threshold',
    name: 'Index threshold',
    iconClass: 'alert',
    alertParamsExpression: lazy(() => import('./expression')),
    validate: validateExpression,
    requiresAppContext: false,
  };
}
