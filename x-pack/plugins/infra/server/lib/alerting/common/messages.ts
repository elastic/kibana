/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AlertStates, Comparator } from '../../../../common/alerting/metrics';
import {
  formatDurationFromTimeUnitChar,
  TimeUnitChar,
} from '../../../../../observability/common/utils/formatters/duration';
import { UNGROUPED_FACTORY_KEY } from './utils';

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

const formatGroup = (group: string) => (group === UNGROUPED_FACTORY_KEY ? 'all hosts' : group);

export const buildFiredAlertReason: (alertResult: {
  group: string;
  metric: string;
  comparator: Comparator;
  threshold: Array<number | string>;
  currentValue: number | string;
  timeSize: number;
  timeUnit: TimeUnitChar;
}) => string = ({ group, metric, comparator, threshold, currentValue, timeSize, timeUnit }) =>
  i18n.translate('xpack.infra.metrics.alerting.threshold.firedAlertReason', {
    defaultMessage:
      '{metric} is {currentValue} in the last {duration} for {group}. Alert when {comparator} {threshold}.',
    values: {
      group: formatGroup(group),
      metric,
      comparator,
      threshold: thresholdToI18n(threshold),
      currentValue,
      duration: formatDurationFromTimeUnitChar(timeSize, timeUnit),
    },
  });

// Once recovered reason messages are re-enabled, checkout this issue https://github.com/elastic/kibana/issues/121272 regarding latest reason format
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
    defaultMessage: '{metric} reported no data in the last {interval} for {group}',
    values: {
      metric,
      interval: `${timeSize}${timeUnit}`,
      group: formatGroup(group),
    },
  });

export const buildErrorAlertReason = (metric: string) =>
  i18n.translate('xpack.infra.metrics.alerting.threshold.errorAlertReason', {
    defaultMessage: 'Elasticsearch failed when attempting to query data for {metric}',
    values: {
      metric,
    },
  });

export const buildInvalidQueryAlertReason = (filterQueryText: string) =>
  i18n.translate('xpack.infra.metrics.alerting.threshold.queryErrorAlertReason', {
    defaultMessage: 'Alert is using a malformed KQL query: {filterQueryText}',
    values: {
      filterQueryText,
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
    defaultMessage: 'A concise description of the reason for the alert',
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

export const viewInAppUrlActionVariableDescription = i18n.translate(
  'xpack.infra.metrics.alerting.viewInAppUrlActionVariableDescription',
  {
    defaultMessage:
      'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
  }
);
