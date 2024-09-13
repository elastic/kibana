/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { validateExpression } from './validation';
import { GeoContainmentAlertParams } from './types';

export function getRuleType(): RuleTypeModel<GeoContainmentAlertParams> {
  return {
    id: '.geo-containment',
    description: i18n.translate('xpack.stackAlerts.geoContainment.descriptionText', {
      defaultMessage: 'Alert when an entity is contained or no longer contained within a boundary.',
    }),
    iconClass: 'globe',
    documentationUrl: null,
    ruleParamsExpression: lazy(() => import('./rule_form')),
    validate: validateExpression,
    requiresAppContext: false,
  };
}
