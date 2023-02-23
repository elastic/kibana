/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ValidationResult } from '@kbn/triggers-actions-ui-plugin/public';
import { isEmpty } from 'lodash';
import {
  Aggregators,
  Comparator,
  CustomMetricExpressionParams,
  FilterQuery,
  MetricExpressionParams,
  QUERY_INVALID,
} from '../../../../common/alerting/metrics';

export const EQUATION_REGEX = /[^A-Z|+|\-|\s|\d+|\.|\(|\)|\/|\*|>|<|=|\?|\:|&|\!|\|]+/g;

const isCustomMetricExpressionParams = (
  subject: MetricExpressionParams
): subject is CustomMetricExpressionParams => {
  return subject.aggType === Aggregators.CUSTOM;
};

export function validateMetricThreshold({
  criteria,
  filterQuery,
}: {
  criteria: MetricExpressionParams[];
  filterQuery?: FilterQuery;
}): ValidationResult {
  const validationResult = { errors: {} };
  const errors: {
    [id: string]: {
      aggField: string[];
      timeSizeUnit: string[];
      timeWindowSize: string[];
      critical: {
        threshold0: string[];
        threshold1: string[];
      };
      warning: {
        threshold0: string[];
        threshold1: string[];
      };
      metric: string[];
      customMetricsError?: string;
      customMetrics: Record<string, { aggType?: string; field?: string }>;
      equation?: string;
    };
  } & { filterQuery?: string[] } = {};
  validationResult.errors = errors;

  if (filterQuery === QUERY_INVALID) {
    errors.filterQuery = [
      i18n.translate('xpack.infra.metrics.alertFlyout.error.invalidFilterQuery', {
        defaultMessage: 'Filter query is invalid.',
      }),
    ];
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
      warning: {
        threshold0: [],
        threshold1: [],
      },
      metric: [],
      filterQuery: [],
      customMetrics: {},
    };
    if (!c.aggType) {
      errors[id].aggField.push(
        i18n.translate('xpack.infra.metrics.alertFlyout.error.aggregationRequired', {
          defaultMessage: 'Aggregation is required.',
        })
      );
    }

    if (!c.threshold || !c.threshold.length) {
      errors[id].critical.threshold0.push(
        i18n.translate('xpack.infra.metrics.alertFlyout.error.thresholdRequired', {
          defaultMessage: 'Threshold is required.',
        })
      );
    }

    if (c.warningThreshold && !c.warningThreshold.length) {
      errors[id].warning.threshold0.push(
        i18n.translate('xpack.infra.metrics.alertFlyout.error.thresholdRequired', {
          defaultMessage: 'Threshold is required.',
        })
      );
    }

    for (const props of [
      { comparator: c.comparator, threshold: c.threshold, type: 'critical' },
      { comparator: c.warningComparator, threshold: c.warningThreshold, type: 'warning' },
    ]) {
      // The Threshold component returns an empty array with a length ([empty]) because it's using delete newThreshold[i].
      // We need to use [...c.threshold] to convert it to an array with an undefined value ([undefined]) so we can test each element.
      const { comparator, threshold, type } = props as {
        comparator?: Comparator;
        threshold?: number[];
        type: 'critical' | 'warning';
      };
      if (threshold && threshold.length && ![...threshold].every(isNumber)) {
        [...threshold].forEach((v, i) => {
          if (!isNumber(v)) {
            const key = i === 0 ? 'threshold0' : 'threshold1';
            errors[id][type][key].push(
              i18n.translate('xpack.infra.metrics.alertFlyout.error.thresholdTypeRequired', {
                defaultMessage: 'Thresholds must contain a valid number.',
              })
            );
          }
        });
      }

      if (comparator === Comparator.BETWEEN && (!threshold || threshold.length < 2)) {
        errors[id][type].threshold1.push(
          i18n.translate('xpack.infra.metrics.alertFlyout.error.thresholdRequired', {
            defaultMessage: 'Threshold is required.',
          })
        );
      }
    }

    if (!c.timeSize) {
      errors[id].timeWindowSize.push(
        i18n.translate('xpack.infra.metrics.alertFlyout.error.timeRequred', {
          defaultMessage: 'Time size is Required.',
        })
      );
    }

    if (!c.metric && c.aggType !== 'count' && c.aggType !== 'custom') {
      errors[id].metric.push(
        i18n.translate('xpack.infra.metrics.alertFlyout.error.metricRequired', {
          defaultMessage: 'Metric is required.',
        })
      );
    }

    if (isCustomMetricExpressionParams(c)) {
      if (!c.customMetrics || (c.customMetrics && c.customMetrics.length < 1)) {
        errors[id].customMetricsError = i18n.translate(
          'xpack.infra.metrics.alertFlyout.error.customMetricsError',
          {
            defaultMessage: 'You must define at least 1 custom metric',
          }
        );
      } else {
        c.customMetrics.forEach((metric) => {
          const customMetricErrors: { aggType?: string; field?: string } = {};
          if (!metric.aggType) {
            customMetricErrors.aggType = i18n.translate(
              'xpack.infra.metrics.alertFlyout.error.customMetrics.aggTypeRequired',
              {
                defaultMessage: 'Aggregation is required',
              }
            );
          }
          if (metric.aggType !== 'count' && !metric.field) {
            customMetricErrors.field = i18n.translate(
              'xpack.infra.metrics.alertFlyout.error.customMetrics.fieldRequired',
              {
                defaultMessage: 'Field is required',
              }
            );
          }
          if (!isEmpty(customMetricErrors)) {
            errors[id].customMetrics[metric.name] = customMetricErrors;
          }
        });
      }

      if (c.equation && c.equation.match(EQUATION_REGEX)) {
        errors[id].equation = i18n.translate(
          'xpack.infra.metrics.alertFlyout.error.equation.invalidCharacters',
          {
            defaultMessage:
              'The equation field only supports the following characters: A-Z, +, -, /, *, (, ), ?, !, &, :, |, >, <, =',
          }
        );
      }
    }
  });

  return validationResult;
}
const isNumber = (value: unknown): value is number => typeof value === 'number';
