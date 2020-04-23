/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { MetricExpressionParams } from '../../../../server/lib/alerting/metric_threshold/types';
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
      timeSizeUnit: [],
      timeWindowSize: [],
      threshold0: [],
      threshold1: [],
      metric: [],
    };

    if (!c.threshold || !c.threshold.length) {
      errors[id].threshold0.push(
        i18n.translate('xpack.infra.metrics.alertFlyout.error.thresholdRequired', {
          defaultMessage: 'Threshold is required.',
        })
      );
    }

    if (c.comparator === 'between' && (!c.threshold || c.threshold.length < 2)) {
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
