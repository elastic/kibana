/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Comparator, AlertStates } from './types';

export const DOCUMENT_COUNT_I18N = i18n.translate(
  'xpack.infra.metrics.alerting.threshold.documentCount',
  {
    defaultMessage: 'Document count',
  }
);

export const stateToAlertMessage = {
  [AlertStates.ALERT]: i18n.translate('xpack.infra.metrics.alerting.threshold.alertState', {
    defaultMessage: 'ALERT',
  }),
  [AlertStates.NO_DATA]: i18n.translate('xpack.infra.metrics.alerting.threshold.noDataState', {
    defaultMessage: 'NO DATA',
  }),
  [AlertStates.ERROR]: i18n.translate('xpack.infra.metrics.alerting.threshold.errorState', {
    defaultMessage: 'ERROR',
  }),
  // TODO: Implement recovered message state
  [AlertStates.OK]: i18n.translate('xpack.infra.metrics.alerting.threshold.okState', {
    defaultMessage: 'OK [Recovered]',
  }),
};

const comparatorToI18n = (comparator: Comparator, threshold: number[], currentValue: number) => {
  const gtText = i18n.translate('xpack.infra.metrics.alerting.threshold.gtComparator', {
    defaultMessage: 'greater than',
  });
  const ltText = i18n.translate('xpack.infra.metrics.alerting.threshold.ltComparator', {
    defaultMessage: 'less than',
  });
  const eqText = i18n.translate('xpack.infra.metrics.alerting.threshold.eqComparator', {
    defaultMessage: 'equal to',
  });

  switch (comparator) {
    case Comparator.BETWEEN:
      return i18n.translate('xpack.infra.metrics.alerting.threshold.betweenComparator', {
        defaultMessage: 'between',
      });
    case Comparator.OUTSIDE_RANGE:
      return i18n.translate('xpack.infra.metrics.alerting.threshold.outsideRangeComparator', {
        defaultMessage: 'not between',
      });
    case Comparator.GT:
      return gtText;
    case Comparator.LT:
      return ltText;
    case Comparator.GT_OR_EQ:
    case Comparator.LT_OR_EQ:
      if (threshold[0] === currentValue) return eqText;
      else if (threshold[0] < currentValue) return ltText;
      return gtText;
  }
};

const thresholdToI18n = ([a, b]: number[]) => {
  if (typeof b === 'undefined') return a;
  return i18n.translate('xpack.infra.metrics.alerting.threshold.thresholdRange', {
    defaultMessage: '{a} and {b}',
    values: { a, b },
  });
};

export const buildFiredAlertReason: (alertResult: {
  metric: string;
  comparator: Comparator;
  threshold: number[];
  currentValue: number;
}) => string = ({ metric, comparator, threshold, currentValue }) =>
  i18n.translate('xpack.infra.metrics.alerting.threshold.firedAlertReason', {
    defaultMessage:
      '{metric} is {comparator} a threshold of {threshold} (current value is {currentValue})',
    values: {
      metric,
      comparator: comparatorToI18n(comparator, threshold, currentValue),
      threshold: thresholdToI18n(threshold),
      currentValue,
    },
  });

export const buildNoDataAlertReason: (alertResult: {
  metric: string;
  timeSize: number;
  timeUnit: string;
}) => string = ({ metric, timeSize, timeUnit }) =>
  i18n.translate('xpack.infra.metrics.alerting.threshold.noDataAlertReason', {
    defaultMessage: '{metric} has reported no data over the past {interval}',
    values: {
      metric,
      interval: `${timeSize}${timeUnit}`,
    },
  });

export const buildErrorAlertReason = (metric: string) =>
  i18n.translate('xpack.infra.metrics.alerting.threshold.errorAlertReason', {
    defaultMessage: 'Elasticsearch failed when attempting to query data for {metric}',
    values: {
      metric,
    },
  });
