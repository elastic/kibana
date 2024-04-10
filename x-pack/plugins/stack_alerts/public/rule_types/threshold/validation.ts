/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toElasticsearchQuery, fromKueryExpression } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { IncompleteError, InvalidError, RuleFormValidationError } from '@kbn/alerts-ui-shared';
import {
  ValidationResult,
  builtInGroupByTypes,
  builtInAggregationTypes,
  builtInComparators,
} from '@kbn/triggers-actions-ui-plugin/public';
import { IndexThresholdRuleParams } from './types';

export const validateExpression = (alertParams: IndexThresholdRuleParams): ValidationResult => {
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
    filterKuery,
  } = alertParams;
  const validationResult = { errors: {} };
  const errors = {
    aggField: new Array<RuleFormValidationError>(),
    termSize: new Array<RuleFormValidationError>(),
    termField: new Array<RuleFormValidationError>(),
    timeWindowSize: new Array<RuleFormValidationError>(),
    threshold0: new Array<RuleFormValidationError>(),
    threshold1: new Array<RuleFormValidationError>(),
    index: new Array<RuleFormValidationError>(),
    timeField: new Array<RuleFormValidationError>(),
    filterKuery: new Array<RuleFormValidationError>(),
  };
  validationResult.errors = errors;

  /* TODO: Remove this comment when ruleFormV2 feature flag reaches GA
   * RuleFormValidationError, which includes InvalidError and IncompleteError, is a part of
   * the new V2 Rule Form. This type extends the string primitive and adds a status property, so it is
   * safe to use in V1.
   */

  if (!!filterKuery) {
    try {
      toElasticsearchQuery(fromKueryExpression(filterKuery as string));
    } catch (e) {
      errors.filterKuery.push(
        InvalidError(
          i18n.translate('xpack.stackAlerts.threshold.ui.validation.error.invalidKql', {
            defaultMessage: 'Filter query is invalid.',
          })
        )
      );
    }
  }

  if (!index || index.length === 0) {
    errors.index.push(
      IncompleteError(
        i18n.translate('xpack.stackAlerts.threshold.ui.validation.error.requiredIndexText', {
          defaultMessage: 'Index is required.',
        })
      )
    );
  }
  if (!timeField) {
    errors.timeField.push(
      IncompleteError(
        i18n.translate('xpack.stackAlerts.threshold.ui.validation.error.requiredTimeFieldText', {
          defaultMessage: 'Time field is required.',
        })
      )
    );
  }
  if (aggType && builtInAggregationTypes[aggType].fieldRequired && !aggField) {
    errors.aggField.push(
      IncompleteError(
        i18n.translate('xpack.stackAlerts.threshold.ui.validation.error.requiredAggFieldText', {
          defaultMessage: 'Aggregation field is required.',
        })
      )
    );
  }
  if (
    groupBy &&
    builtInGroupByTypes[groupBy] &&
    builtInGroupByTypes[groupBy].sizeRequired &&
    !termSize
  ) {
    errors.termSize.push(
      IncompleteError(
        i18n.translate('xpack.stackAlerts.threshold.ui.validation.error.requiredTermSizedText', {
          defaultMessage: 'Term size is required.',
        })
      )
    );
  }
  if (
    groupBy &&
    builtInGroupByTypes[groupBy].validNormalizedTypes &&
    builtInGroupByTypes[groupBy].validNormalizedTypes.length > 0 &&
    !termField
  ) {
    errors.termField.push(
      IncompleteError(
        i18n.translate('xpack.stackAlerts.threshold.ui.validation.error.requiredTermFieldText', {
          defaultMessage: 'Term field is required.',
        })
      )
    );
  }
  if (!timeWindowSize) {
    errors.timeWindowSize.push(
      IncompleteError(
        i18n.translate(
          'xpack.stackAlerts.threshold.ui.validation.error.requiredTimeWindowSizeText',
          {
            defaultMessage: 'Time window size is required.',
          }
        )
      )
    );
  }
  if (!threshold || threshold.length === 0 || threshold[0] === undefined) {
    errors.threshold0.push(
      IncompleteError(
        thresholdComparator
          ? i18n.translate(
              'xpack.stackAlerts.threshold.ui.validation.error.requiredThreshold0Text',
              {
                defaultMessage: 'Threshold 0 is required.',
              }
            )
          : i18n.translate(
              'xpack.stackAlerts.threshold.ui.validation.error.requiredThresholdText',
              {
                defaultMessage: 'Threshold is required.',
              }
            )
      )
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
      IncompleteError(
        i18n.translate('xpack.stackAlerts.threshold.ui.validation.error.requiredThreshold1Text', {
          defaultMessage: 'Threshold 1 is required.',
        })
      )
    );
  }
  if (threshold && threshold.length === 2 && threshold[0] > threshold[1]) {
    errors.threshold1.push(
      InvalidError(
        i18n.translate(
          'xpack.stackAlerts.threshold.ui.validation.error.greaterThenThreshold0Text',
          {
            defaultMessage: 'Threshold 1 should be > Threshold 0.',
          }
        )
      )
    );
  }
  return validationResult;
};
