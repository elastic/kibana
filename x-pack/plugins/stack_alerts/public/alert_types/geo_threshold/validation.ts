/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { ValidationResult } from '../../../../triggers_actions_ui/public';
import { GeoThresholdAlertParams } from './types';

export const validateExpression = (alertParams: GeoThresholdAlertParams): ValidationResult => {
  const {
    index,
    geoField,
    entity,
    dateField,
    trackingEvent,
    boundaryType,
    boundaryIndexTitle,
    boundaryGeoField,
  } = alertParams;
  const validationResult = { errors: {} };
  const errors = {
    index: new Array<string>(),
    indexId: new Array<string>(),
    geoField: new Array<string>(),
    entity: new Array<string>(),
    dateField: new Array<string>(),
    trackingEvent: new Array<string>(),
    boundaryType: new Array<string>(),
    boundaryIndexTitle: new Array<string>(),
    boundaryIndexId: new Array<string>(),
    boundaryGeoField: new Array<string>(),
  };
  validationResult.errors = errors;

  if (!index) {
    errors.index.push(
      i18n.translate('xpack.stackAlerts.geoThreshold.error.requiredIndexTitleText', {
        defaultMessage: 'Index pattern is required.',
      })
    );
  }

  if (!geoField) {
    errors.geoField.push(
      i18n.translate('xpack.stackAlerts.geoThreshold.error.requiredGeoFieldText', {
        defaultMessage: 'Geo field is required.',
      })
    );
  }

  if (!entity) {
    errors.entity.push(
      i18n.translate('xpack.stackAlerts.geoThreshold.error.requiredEntityText', {
        defaultMessage: 'Entity is required.',
      })
    );
  }

  if (!dateField) {
    errors.dateField.push(
      i18n.translate('xpack.stackAlerts.geoThreshold.error.requiredDateFieldText', {
        defaultMessage: 'Date field is required.',
      })
    );
  }

  if (!trackingEvent) {
    errors.trackingEvent.push(
      i18n.translate('xpack.stackAlerts.geoThreshold.error.requiredTrackingEventText', {
        defaultMessage: 'Tracking event is required.',
      })
    );
  }

  if (!boundaryType) {
    errors.boundaryType.push(
      i18n.translate('xpack.stackAlerts.geoThreshold.error.requiredBoundaryTypeText', {
        defaultMessage: 'Boundary type is required.',
      })
    );
  }

  if (!boundaryIndexTitle) {
    errors.boundaryIndexTitle.push(
      i18n.translate('xpack.stackAlerts.geoThreshold.error.requiredBoundaryIndexTitleText', {
        defaultMessage: 'Boundary index pattern title is required.',
      })
    );
  }

  if (!boundaryGeoField) {
    errors.boundaryGeoField.push(
      i18n.translate('xpack.stackAlerts.geoThreshold.error.requiredBoundaryGeoFieldText', {
        defaultMessage: 'Boundary geo field is required.',
      })
    );
  }

  return validationResult;
};
