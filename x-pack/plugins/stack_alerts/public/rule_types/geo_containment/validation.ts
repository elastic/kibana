/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IncompleteError, RuleFormValidationError } from '@kbn/alerts-ui-shared';
import { i18n } from '@kbn/i18n';
import { ValidationResult } from '@kbn/triggers-actions-ui-plugin/public';
import { GeoContainmentAlertParams } from './types';

export const validateExpression = (alertParams: GeoContainmentAlertParams): ValidationResult => {
  const { index, geoField, entity, dateField, boundaryType, boundaryIndexTitle, boundaryGeoField } =
    alertParams;
  const validationResult = { errors: {} };
  const errors = {
    index: new Array<RuleFormValidationError>(),
    indexId: new Array<RuleFormValidationError>(),
    geoField: new Array<RuleFormValidationError>(),
    entity: new Array<RuleFormValidationError>(),
    dateField: new Array<RuleFormValidationError>(),
    boundaryType: new Array<RuleFormValidationError>(),
    boundaryIndexTitle: new Array<RuleFormValidationError>(),
    boundaryIndexId: new Array<RuleFormValidationError>(),
    boundaryGeoField: new Array<RuleFormValidationError>(),
  };
  validationResult.errors = errors;

  if (!index) {
    errors.index.push(
      IncompleteError(
        i18n.translate('xpack.stackAlerts.geoContainment.error.requiredIndexTitleText', {
          defaultMessage: 'Data view is required.',
        })
      )
    );
  }

  if (!geoField) {
    errors.geoField.push(
      IncompleteError(
        i18n.translate('xpack.stackAlerts.geoContainment.error.requiredGeoFieldText', {
          defaultMessage: 'Geo field is required.',
        })
      )
    );
  }

  if (!entity) {
    errors.entity.push(
      IncompleteError(
        i18n.translate('xpack.stackAlerts.geoContainment.error.requiredEntityText', {
          defaultMessage: 'Entity is required.',
        })
      )
    );
  }

  if (!dateField) {
    errors.dateField.push(
      IncompleteError(
        i18n.translate('xpack.stackAlerts.geoContainment.error.requiredDateFieldText', {
          defaultMessage: 'Date field is required.',
        })
      )
    );
  }

  if (!boundaryType) {
    errors.boundaryType.push(
      IncompleteError(
        i18n.translate('xpack.stackAlerts.geoContainment.error.requiredBoundaryTypeText', {
          defaultMessage: 'Boundary type is required.',
        })
      )
    );
  }

  if (!boundaryIndexTitle) {
    errors.boundaryIndexTitle.push(
      IncompleteError(
        i18n.translate('xpack.stackAlerts.geoContainment.error.requiredBoundaryIndexTitleText', {
          defaultMessage: 'Boundary data view is required.',
        })
      )
    );
  }

  if (!boundaryGeoField) {
    errors.boundaryGeoField.push(
      IncompleteError(
        i18n.translate('xpack.stackAlerts.geoContainment.error.requiredBoundaryGeoFieldText', {
          defaultMessage: 'Boundary geo field is required.',
        })
      )
    );
  }

  return validationResult;
};
