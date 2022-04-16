/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ValidationResult, builtInComparators } from '@kbn/triggers-actions-ui-plugin/public';
import { EsQueryAlertParams } from './types';
import { isSearchSourceAlert } from './util';

export const validateExpression = (alertParams: EsQueryAlertParams): ValidationResult => {
  const { size, threshold, timeWindowSize, thresholdComparator } = alertParams;
  const validationResult = { errors: {} };
  const errors = {
    index: new Array<string>(),
    timeField: new Array<string>(),
    esQuery: new Array<string>(),
    size: new Array<string>(),
    threshold0: new Array<string>(),
    threshold1: new Array<string>(),
    thresholdComparator: new Array<string>(),
    timeWindowSize: new Array<string>(),
    searchConfiguration: new Array<string>(),
  };
  validationResult.errors = errors;
  if (!threshold || threshold.length === 0 || threshold[0] === undefined) {
    errors.threshold0.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.requiredThreshold0Text', {
        defaultMessage: 'Threshold 0 is required.',
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
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.requiredThreshold1Text', {
        defaultMessage: 'Threshold 1 is required.',
      })
    );
  }
  if (threshold && threshold.length === 2 && threshold[0] > threshold[1]) {
    errors.threshold1.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.greaterThenThreshold0Text', {
        defaultMessage: 'Threshold 1 must be > Threshold 0.',
      })
    );
  }
  if (!timeWindowSize) {
    errors.timeWindowSize.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.requiredTimeWindowSizeText', {
        defaultMessage: 'Time window size is required.',
      })
    );
  }

  if (!size) {
    errors.size.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.requiredSizeText', {
        defaultMessage: 'Size is required.',
      })
    );
  }
  if ((size && size < 0) || size > 10000) {
    errors.size.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.invalidSizeRangeText', {
        defaultMessage: 'Size must be between 0 and {max, number}.',
        values: { max: 10000 },
      })
    );
  }

  /**
   * Skip esQuery and index params check if it is search source alert,
   * since it should contain searchConfiguration instead of esQuery and index.
   */
  const isSearchSource = isSearchSourceAlert(alertParams);
  if (isSearchSource) {
    if (!alertParams.searchConfiguration) {
      errors.searchConfiguration.push(
        i18n.translate(
          'xpack.stackAlerts.esQuery.ui.validation.error.requiredSearchConfiguration',
          {
            defaultMessage: 'Search source configuration is required.',
          }
        )
      );
    }
    return validationResult;
  }

  if (!alertParams.index || alertParams.index.length === 0) {
    errors.index.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.requiredIndexText', {
        defaultMessage: 'Index is required.',
      })
    );
  }

  if (!alertParams.timeField) {
    errors.timeField.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.requiredTimeFieldText', {
        defaultMessage: 'Time field is required.',
      })
    );
  }

  if (!alertParams.esQuery) {
    errors.esQuery.push(
      i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.requiredQueryText', {
        defaultMessage: 'Elasticsearch query is required.',
      })
    );
  } else {
    try {
      const parsedQuery = JSON.parse(alertParams.esQuery);
      if (!parsedQuery.query) {
        errors.esQuery.push(
          i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.requiredEsQueryText', {
            defaultMessage: `Query field is required.`,
          })
        );
      }
    } catch (err) {
      errors.esQuery.push(
        i18n.translate('xpack.stackAlerts.esQuery.ui.validation.error.jsonQueryText', {
          defaultMessage: 'Query must be valid JSON.',
        })
      );
    }
  }

  return validationResult;
};
