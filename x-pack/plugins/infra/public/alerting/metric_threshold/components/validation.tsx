/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  MetricExpressionParams,
  Comparator,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../server/lib/alerting/metric_threshold/types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ValidationResult } from '../../../../../triggers_actions_ui/public/types';

export function validateMetricThreshold({
  criteria,
}: {
  criteria: MetricExpressionParams[];
}): ValidationResult {
  const validationResult = { errors: {} };
  const errors: {
    [id: string]: {
      aggField: string[];
      timeSizeUnit: string[];
      timeWindowSize: string[];
      threshold0: string[];
      threshold1: string[];
      metric: string[];
    };
  } = {};
  validationResult.errors = errors;

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
      threshold0: [],
      threshold1: [],
      metric: [],
    };
    if (!c.aggType) {
      errors[id].aggField.push(
        i18n.translate('xpack.infra.metrics.alertFlyout.error.aggregationRequired', {
          defaultMessage: 'Aggregation is required.',
        })
      );
    }

    if (!c.threshold || !c.threshold.length) {
      errors[id].threshold0.push(
        i18n.translate('xpack.infra.metrics.alertFlyout.error.thresholdRequired', {
          defaultMessage: 'Threshold is required.',
        })
      );
    }

    // The Threshold component returns an empty array with a length ([empty]) because it's using delete newThreshold[i].
    // We need to use [...c.threshold] to convert it to an array with an undefined value ([undefined]) so we can test each element.
    if (c.threshold && c.threshold.length && ![...c.threshold].every(isNumber)) {
      [...c.threshold].forEach((v, i) => {
        if (!isNumber(v)) {
          const key = i === 0 ? 'threshold0' : 'threshold1';
          errors[id][key].push(
            i18n.translate('xpack.infra.metrics.alertFlyout.error.thresholdTypeRequired', {
              defaultMessage: 'Thresholds must contain a valid number.',
            })
          );
        }
      });
    }

    if (c.comparator === Comparator.BETWEEN && (!c.threshold || c.threshold.length < 2)) {
      errors[id].threshold1.push(
        i18n.translate('xpack.infra.metrics.alertFlyout.error.thresholdRequired', {
          defaultMessage: 'Threshold is required.',
        })
      );
    }

    if (!c.timeSize) {
      errors[id].timeWindowSize.push(
        i18n.translate('xpack.infra.metrics.alertFlyout.error.timeRequred', {
          defaultMessage: 'Time size is Required.',
        })
      );
    }

    if (!c.metric && c.aggType !== 'count') {
      errors[id].metric.push(
        i18n.translate('xpack.infra.metrics.alertFlyout.error.metricRequired', {
          defaultMessage: 'Metric is required.',
        })
      );
    }
  });

  return validationResult;
}

const isNumber = (value: unknown): value is number => typeof value === 'number';
