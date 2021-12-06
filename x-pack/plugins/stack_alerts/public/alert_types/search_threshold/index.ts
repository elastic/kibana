/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { validateExpression } from './validation';
import { SearchThresholdAlertParams } from './types';
import { AlertTypeModel } from '../../../../triggers_actions_ui/public';

export type { SearchThresholdAlertParams } from './types';

export function getAlertType(): AlertTypeModel<SearchThresholdAlertParams> {
  return {
    id: '.search-threshold',
    description: i18n.translate('xpack.stackAlerts.searchThreshold.ui.alertType.descriptionText', {
      defaultMessage: 'Alert when the number of documents meets the threshold.',
    }),
    iconClass: 'alert',
    documentationUrl: null,
    alertParamsExpression: lazy(() => import('./expression')),
    validate: validateExpression,
    // if true users can only created in the application context not in alerting UI
    requiresAppContext: false,
  };
}
