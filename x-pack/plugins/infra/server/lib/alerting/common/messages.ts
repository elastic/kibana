/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  [AlertStates.WARNING]: i18n.translate('xpack.infra.metrics.alerting.threshold.warningState', {
    defaultMessage: 'WARNING',
  }),
  [AlertStates.NO_DATA]: i18n.translate('xpack.infra.metrics.alerting.threshold.noDataState', {
    defaultMessage: 'NO DATA',
  }),
  [AlertStates.ERROR]: i18n.translate('xpack.infra.metrics.alerting.threshold.errorState', {
    defaultMessage: 'ERROR',
  }),
  [AlertStates.OK]: i18n.translate('xpack.infra.metrics.alerting.threshold.okState', {
    defaultMessage: 'OK [Recovered]',
  }),
};

const toNumber = (value: number | string) =>
  typeof value === 'string' ? parseFloat(value) : value;

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
    case Comparator.LT_OR_EQ: {
      if (currentValue === threshold[0]) {
        return eqText;
      } else if (currentValue < threshold[0]) {
        return ltText;
      } else {
        return gtText;
      }
    }
  }
};

const recoveredComparatorToI18n = (
  comparator: Comparator,
  threshold: number[],
  currentValue: number
) => {
  const belowText = i18n.translate('xpack.infra.metrics.alerting.threshold.belowRecovery', {
    defaultMessage: 'below',
  });
  const aboveText = i18n.translate('xpack.infra.metrics.alerting.threshold.aboveRecovery', {
    defaultMessage: 'above',
  });
  switch (comparator) {
    case Comparator.BETWEEN:
      return currentValue < threshold[0] ? belowText : aboveText;
    case Comparator.OUTSIDE_RANGE:
      return i18n.translate('xpack.infra.metrics.alerting.threshold.betweenRecovery', {
        defaultMessage: 'between',
      });
    case Comparator.GT:
    case Comparator.GT_OR_EQ:
      return belowText;
    case Comparator.LT:
    case Comparator.LT_OR_EQ:
      return aboveText;
  }
};

const thresholdToI18n = ([a, b]: Array<number | string>) => {
  if (typeof b === 'undefined') return a;
  return i18n.translate('xpack.infra.metrics.alerting.threshold.thresholdRange', {
    defaultMessage: '{a} and {b}',
    values: { a, b },
  });
};

export const buildFiredAlertReason: (alertResult: {
  group: string;
  metric: string;
  comparator: Comparator;
  threshold: Array<number | string>;
  currentValue: number | string;
}) => string = ({ group, metric, comparator, threshold, currentValue }) =>
  i18n.translate('xpack.infra.metrics.alerting.threshold.firedAlertReason', {
    defaultMessage:
      '{metric} is {comparator} a threshold of {threshold} (current value is {currentValue}) for {group}',
    values: {
      group,
      metric,
      comparator: comparatorToI18n(comparator, threshold.map(toNumber), toNumber(currentValue)),
      threshold: thresholdToI18n(threshold),
      currentValue,
    },
  });

export const buildRecoveredAlertReason: (alertResult: {
  group: string;
  metric: string;
  comparator: Comparator;
  threshold: Array<number | string>;
  currentValue: number | string;
}) => string = ({ group, metric, comparator, threshold, currentValue }) =>
  i18n.translate('xpack.infra.metrics.alerting.threshold.recoveredAlertReason', {
    defaultMessage:
      '{metric} is now {comparator} a threshold of {threshold} (current value is {currentValue}) for {group}',
    values: {
      metric,
      comparator: recoveredComparatorToI18n(
        comparator,
        threshold.map(toNumber),
        toNumber(currentValue)
      ),
      threshold: thresholdToI18n(threshold),
      currentValue,
      group,
    },
  });

export const buildNoDataAlertReason: (alertResult: {
  group: string;
  metric: string;
  timeSize: number;
  timeUnit: string;
}) => string = ({ group, metric, timeSize, timeUnit }) =>
  i18n.translate('xpack.infra.metrics.alerting.threshold.noDataAlertReason', {
    defaultMessage: '{metric} has reported no data over the past {interval} for {group}',
    values: {
      metric,
      interval: `${timeSize}${timeUnit}`,
      group,
    },
  });

export const buildErrorAlertReason = (metric: string) =>
  i18n.translate('xpack.infra.metrics.alerting.threshold.errorAlertReason', {
    defaultMessage: 'Elasticsearch failed when attempting to query data for {metric}',
    values: {
      metric,
    },
  });

export const groupActionVariableDescription = i18n.translate(
  'xpack.infra.metrics.alerting.groupActionVariableDescription',
  {
    defaultMessage: 'Name of the group reporting data',
  }
);

export const alertStateActionVariableDescription = i18n.translate(
  'xpack.infra.metrics.alerting.alertStateActionVariableDescription',
  {
    defaultMessage: 'Current state of the alert',
  }
);

export const reasonActionVariableDescription = i18n.translate(
  'xpack.infra.metrics.alerting.reasonActionVariableDescription',
  {
    defaultMessage:
      'A description of why the alert is in this state, including which metrics have crossed which thresholds',
  }
);

export const timestampActionVariableDescription = i18n.translate(
  'xpack.infra.metrics.alerting.timestampDescription',
  {
    defaultMessage: 'A timestamp of when the alert was detected.',
  }
);

export const valueActionVariableDescription = i18n.translate(
  'xpack.infra.metrics.alerting.valueActionVariableDescription',
  {
    defaultMessage:
      'The value of the metric in the specified condition. Usage: (ctx.value.condition0, ctx.value.condition1, etc...).',
  }
);

export const metricActionVariableDescription = i18n.translate(
  'xpack.infra.metrics.alerting.metricActionVariableDescription',
  {
    defaultMessage:
      'The metric name in the specified condition. Usage: (ctx.metric.condition0, ctx.metric.condition1, etc...).',
  }
);

export const thresholdActionVariableDescription = i18n.translate(
  'xpack.infra.metrics.alerting.thresholdActionVariableDescription',
  {
    defaultMessage:
      'The threshold value of the metric for the specified condition. Usage: (ctx.threshold.condition0, ctx.threshold.condition1, etc...).',
  }
);
