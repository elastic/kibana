/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  ValidationResult,
  builtInGroupByTypes,
  builtInAggregationTypes,
  builtInComparators,
} from '@kbn/triggers-actions-ui-plugin/public';
import { IndexThresholdAlertParams } from './types';

export const validateExpression = (alertParams: IndexThresholdAlertParams): ValidationResult => {
  const {
    index,
    timeField,
    aggType,
    aggField,
    groupBy,
    termSize,
    termField,
    threshold,
    timeWindowSize,
    thresholdComparator,
  } = alertParams;
  const validationResult = { errors: {} };
  const errors = {
    aggField: new Array<string>(),
    termSize: new Array<string>(),
    termField: new Array<string>(),
    timeWindowSize: new Array<string>(),
    threshold0: new Array<string>(),
    threshold1: new Array<string>(),
    index: new Array<string>(),
    timeField: new Array<string>(),
  };
  validationResult.errors = errors;
  if (!index || index.length === 0) {
    errors.index.push(
      i18n.translate('xpack.stackAlerts.threshold.ui.validation.error.requiredIndexText', {
        defaultMessage: 'Index is required.',
      })
    );
  }
  if (!timeField) {
    errors.timeField.push(
      i18n.translate('xpack.stackAlerts.threshold.ui.validation.error.requiredTimeFieldText', {
        defaultMessage: 'Time field is required.',
      })
    );
  }
  if (aggType && builtInAggregationTypes[aggType].fieldRequired && !aggField) {
    errors.aggField.push(
      i18n.translate('xpack.stackAlerts.threshold.ui.validation.error.requiredAggFieldText', {
        defaultMessage: 'Aggregation field is required.',
      })
    );
  }
  if (
    groupBy &&
    builtInGroupByTypes[groupBy] &&
    builtInGroupByTypes[groupBy].sizeRequired &&
    !termSize
  ) {
    errors.termSize.push(
      i18n.translate('xpack.stackAlerts.threshold.ui.validation.error.requiredTermSizedText', {
        defaultMessage: 'Term size is required.',
      })
    );
  }
  if (
    groupBy &&
    builtInGroupByTypes[groupBy].validNormalizedTypes &&
    builtInGroupByTypes[groupBy].validNormalizedTypes.length > 0 &&
    !termField
  ) {
    errors.termField.push(
      i18n.translate('xpack.stackAlerts.threshold.ui.validation.error.requiredTermFieldText', {
        defaultMessage: 'Term field is required.',
      })
    );
  }
  if (!timeWindowSize) {
    errors.timeWindowSize.push(
      i18n.translate('xpack.stackAlerts.threshold.ui.validation.error.requiredTimeWindowSizeText', {
        defaultMessage: 'Time window size is required.',
      })
    );
  }
  if (!threshold || threshold.length === 0 || threshold[0] === undefined) {
    errors.threshold0.push(
      i18n.translate('xpack.stackAlerts.threshold.ui.validation.error.requiredThreshold0Text', {
        defaultMessage: 'Threshold0 is required.',
      })
    );
  }
  if (
    thresholdComparator &&
    builtInComparators[thresholdComparator].requiredValues > 1 &&
    (!threshold ||
      threshold[1] === undefined ||
      (threshold && threshold.length < builtInComparators[thresholdComparator!].requiredValues))
  ) {
    errors.threshold1.push(
      i18n.translate('xpack.stackAlerts.threshold.ui.validation.error.requiredThreshold1Text', {
        defaultMessage: 'Threshold1 is required.',
      })
    );
  }
  if (threshold && threshold.length === 2 && threshold[0] > threshold[1]) {
    errors.threshold1.push(
      i18n.translate('xpack.stackAlerts.threshold.ui.validation.error.greaterThenThreshold0Text', {
        defaultMessage: 'Threshold1 should be > Threshold0.',
      })
    );
  }
  return validationResult;
};
