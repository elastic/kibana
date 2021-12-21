/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ValidationResult } from '../../../../triggers_actions_ui/public';
import { GeoContainmentAlertParams } from './types';

export const validateExpression = (alertParams: GeoContainmentAlertParams): ValidationResult => {
  const { index, geoField, entity, dateField, boundaryType, boundaryIndexTitle, boundaryGeoField } =
    alertParams;
  const validationResult = { errors: {} };
  const errors = {
    index: new Array<string>(),
    indexId: new Array<string>(),
    geoField: new Array<string>(),
    entity: new Array<string>(),
    dateField: new Array<string>(),
    boundaryType: new Array<string>(),
    boundaryIndexTitle: new Array<string>(),
    boundaryIndexId: new Array<string>(),
    boundaryGeoField: new Array<string>(),
  };
  validationResult.errors = errors;

  if (!index) {
    errors.index.push(
      i18n.translate('xpack.stackAlerts.geoContainment.error.requiredIndexTitleText', {
        defaultMessage: 'Data view is required.',
      })
    );
  }

  if (!geoField) {
    errors.geoField.push(
      i18n.translate('xpack.stackAlerts.geoContainment.error.requiredGeoFieldText', {
        defaultMessage: 'Geo field is required.',
      })
    );
  }

  if (!entity) {
    errors.entity.push(
      i18n.translate('xpack.stackAlerts.geoContainment.error.requiredEntityText', {
        defaultMessage: 'Entity is required.',
      })
    );
  }

  if (!dateField) {
    errors.dateField.push(
      i18n.translate('xpack.stackAlerts.geoContainment.error.requiredDateFieldText', {
        defaultMessage: 'Date field is required.',
      })
    );
  }

  if (!boundaryType) {
    errors.boundaryType.push(
      i18n.translate('xpack.stackAlerts.geoContainment.error.requiredBoundaryTypeText', {
        defaultMessage: 'Boundary type is required.',
      })
    );
  }

  if (!boundaryIndexTitle) {
    errors.boundaryIndexTitle.push(
      i18n.translate('xpack.stackAlerts.geoContainment.error.requiredBoundaryIndexTitleText', {
        defaultMessage: 'Boundary data view title is required.',
      })
    );
  }

  if (!boundaryGeoField) {
    errors.boundaryGeoField.push(
      i18n.translate('xpack.stackAlerts.geoContainment.error.requiredBoundaryGeoFieldText', {
        defaultMessage: 'Boundary geo field is required.',
      })
    );
  }

  return validationResult;
};
