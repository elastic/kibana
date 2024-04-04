/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { buildEsQuery, fromKueryExpression } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { ValidationResult } from '@kbn/triggers-actions-ui-plugin/public';
import { isEmpty } from 'lodash';
import {
  Comparator,
  CustomMetricExpressionParams,
  CustomThresholdSearchSourceFields,
} from '../../../../common/custom_threshold_rule/types';

export const EQUATION_REGEX = /[^A-Z|+|\-|\s|\d+|\.|\(|\)|\/|\*|>|<|=|\?|\:|&|\!|\|]+/g;

export function validateCustomThreshold({
  criteria,
  searchConfiguration,
  uiSettings,
}: {
  criteria: CustomMetricExpressionParams[];
  searchConfiguration: CustomThresholdSearchSourceFields;
  uiSettings: IUiSettingsClient;
}): ValidationResult {
  const validationResult = { errors: {} };
  const errors: {
    [id: string]: {
      timeSizeUnit: string[];
      timeWindowSize: string[];
      critical: {
        threshold0: string[];
        threshold1: string[];
      };
      metricsError?: string;
      metrics: Record<string, { aggType?: string; field?: string; filter?: string }>;
      equation?: string;
    };
  } & { filterQuery?: string[]; searchConfiguration?: string[] } = {};
  validationResult.errors = errors;

  if (!searchConfiguration || !searchConfiguration.index) {
    errors.searchConfiguration = [
      i18n.translate(
        'xpack.observability.customThreshold.rule.alertFlyout.error.invalidSearchConfiguration',
        {
          defaultMessage: 'Data view is required.',
        }
      ),
    ];
  }

  if (searchConfiguration && searchConfiguration.query) {
    try {
      buildEsQuery(
        undefined,
        [{ query: searchConfiguration.query.query, language: 'kuery' }],
        [],
        getEsQueryConfig(uiSettings)
      );
    } catch (e) {
      const errorReason = e.shortMessage || '';
      errors.filterQuery = [
        i18n.translate(
          'xpack.observability.customThreshold.rule.alertFlyout.error.invalidFilterQuery',
          {
            values: { errorReason },
            defaultMessage: `Filter query is invalid. {errorReason}`,
          }
        ),
      ];
    }
  }

  if (!criteria || !criteria.length) {
    return validationResult;
  }

  criteria.forEach((c, idx) => {
    // Create an id for each criteria, so we can map errors to specific criteria.
    const id = idx.toString();

    errors[id] = errors[id] || {
      aggField: [],
      timeSizeUnit: [],
      timeWindowSize: [],
      critical: {
        threshold0: [],
        threshold1: [],
      },
      metric: [],
      metrics: {},
    };

    if (!c.threshold || !c.threshold.length) {
      errors[id].critical.threshold0.push(
        i18n.translate(
          'xpack.observability.customThreshold.rule.alertFlyout.error.thresholdRequired',
          {
            defaultMessage: 'Threshold is required.',
          }
        )
      );
    }

    // The Threshold component returns an empty array with a length ([empty]) because it's using delete newThreshold[i].
    // We need to use [...c.threshold] to convert it to an array with an undefined value ([undefined]) so we can test each element.
    const { comparator, threshold } = { comparator: c.comparator, threshold: c.threshold } as {
      comparator?: Comparator;
      threshold?: number[];
    };
    if (threshold && threshold.length && ![...threshold].every(isNumber)) {
      [...threshold].forEach((v, i) => {
        if (!isNumber(v)) {
          const key = i === 0 ? 'threshold0' : 'threshold1';
          errors[id].critical[key].push(
            i18n.translate(
              'xpack.observability.customThreshold.rule.alertFlyout.error.thresholdTypeRequired',
              {
                defaultMessage: 'Thresholds must contain a valid number.',
              }
            )
          );
        }
      });
    }

    if (comparator === Comparator.BETWEEN && (!threshold || threshold.length < 2)) {
      errors[id].critical.threshold1.push(
        i18n.translate(
          'xpack.observability.customThreshold.rule.alertFlyout.error.thresholdRequired',
          {
            defaultMessage: 'Threshold is required.',
          }
        )
      );
    }

    if (!c.timeSize) {
      errors[id].timeWindowSize.push(
        i18n.translate('xpack.observability.customThreshold.rule.alertFlyout.error.timeRequred', {
          defaultMessage: 'Time size is Required.',
        })
      );
    }

    if (!c.metrics || (c.metrics && c.metrics.length < 1)) {
      errors[id].metricsError = i18n.translate(
        'xpack.observability.customThreshold.rule.alertFlyout.error.metricsError',
        {
          defaultMessage: 'You must define at least 1 custom metric',
        }
      );
    } else {
      c.metrics.forEach((metric) => {
        const customMetricErrors: { aggType?: string; field?: string; filter?: string } = {};
        if (!metric.aggType) {
          customMetricErrors.aggType = i18n.translate(
            'xpack.observability.customThreshold.rule.alertFlyout.error.metrics.aggTypeRequired',
            {
              defaultMessage: 'Aggregation is required',
            }
          );
        }
        if (metric.aggType !== 'count' && !metric.field) {
          customMetricErrors.field = i18n.translate(
            'xpack.observability.customThreshold.rule.alertFlyout.error.metrics.fieldRequired',
            {
              defaultMessage: 'Field is required',
            }
          );
        }
        if (metric.aggType === 'count' && metric.filter) {
          try {
            fromKueryExpression(metric.filter);
          } catch (e) {
            customMetricErrors.filter = e.message;
          }
        }
        if (!isEmpty(customMetricErrors)) {
          errors[id].metrics[metric.name] = customMetricErrors;
        }
      });
    }

    if (c.equation && c.equation.match(EQUATION_REGEX)) {
      errors[id].equation = i18n.translate(
        'xpack.observability.customThreshold.rule.alertFlyout.error.equation.invalidCharacters',
        {
          defaultMessage:
            'The equation field only supports the following characters: A-Z, +, -, /, *, (, ), ?, !, &, :, |, >, <, =',
        }
      );
    }
  });

  return validationResult;
}
const isNumber = (value: unknown): value is number => typeof value === 'number';
