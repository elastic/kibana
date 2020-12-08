/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { validateExpression } from './validation';
import { GeoContainmentAlertParams } from './types';
import { AlertTypeModel } from '../../../../triggers_actions_ui/public';

export function getAlertType(): AlertTypeModel<GeoContainmentAlertParams> {
  return {
    id: '.geo-containment',
    name: i18n.translate('xpack.stackAlerts.geoContainment.name.trackingContainment', {
      defaultMessage: 'Tracking containment',
    }),
    description: i18n.translate('xpack.stackAlerts.geoContainment.descriptionText', {
      defaultMessage: 'Alert when an entity is contained within a geo boundary.',
    }),
    iconClass: 'globe',
    documentationUrl: null,
    alertParamsExpression: lazy(() => import('./query_builder')),
    validate: validateExpression,
    requiresAppContext: false,
  };
}
