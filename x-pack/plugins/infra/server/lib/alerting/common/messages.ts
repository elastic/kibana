/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  formatDurationFromTimeUnitChar,
  TimeUnitChar,
} from '@kbn/observability-plugin/common/utils/formatters/duration';
import { AlertStates, Comparator } from '../../../../common/alerting/metrics';
import { UNGROUPED_FACTORY_KEY } from './utils';

export const DOCUMENT_COUNT_I18N = i18n.translate(
  'xpack.infra.metrics.alerting.threshold.documentCount',
  {
    defaultMessage: 'Document count',
  }
);

export const CUSTOM_EQUATION_I18N = i18n.translate(
  'xpack.infra.metrics.alerting.threshold.customEquation',
  {
    defaultMessage: 'Custom equation',
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

const formatGroup = (group: string) => (group === UNGROUPED_FACTORY_KEY ? '' : ` for ${group}`);

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
      '{metric} is {currentValue} in the last {duration}{group}. Alert when {comparator} {threshold}.',
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
    defaultMessage: '{metric} reported no data in the last {interval}{group}',
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

export const groupByKeysActionVariableDescription = i18n.translate(
  'xpack.infra.metrics.alerting.groupByKeysActionVariableDescription',
  {
    defaultMessage: 'The object containing groups that are reporting data',
  }
);

export const alertStateActionVariableDescription = i18n.translate(
  'xpack.infra.metrics.alerting.alertStateActionVariableDescription',
  {
    defaultMessage: 'Current state of the alert',
  }
);

export const alertDetailUrlActionVariableDescription = i18n.translate(
  'xpack.infra.metrics.alerting.alertDetailUrlActionVariableDescription',
  {
    defaultMessage:
      'Link to the alert troubleshooting view for further context and details. This will be an empty string if the server.publicBaseUrl is not configured.',
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
    defaultMessage: 'Link to the alert source',
  }
);

export const cloudActionVariableDescription = i18n.translate(
  'xpack.infra.metrics.alerting.cloudActionVariableDescription',
  {
    defaultMessage: 'The cloud object defined by ECS if available in the source.',
  }
);

export const hostActionVariableDescription = i18n.translate(
  'xpack.infra.metrics.alerting.hostActionVariableDescription',
  {
    defaultMessage: 'The host object defined by ECS if available in the source.',
  }
);

export const containerActionVariableDescription = i18n.translate(
  'xpack.infra.metrics.alerting.containerActionVariableDescription',
  {
    defaultMessage: 'The container object defined by ECS if available in the source.',
  }
);

export const orchestratorActionVariableDescription = i18n.translate(
  'xpack.infra.metrics.alerting.orchestratorActionVariableDescription',
  {
    defaultMessage: 'The orchestrator object defined by ECS if available in the source.',
  }
);

export const labelsActionVariableDescription = i18n.translate(
  'xpack.infra.metrics.alerting.labelsActionVariableDescription',
  {
    defaultMessage: 'List of labels associated with the entity where this alert triggered.',
  }
);

export const tagsActionVariableDescription = i18n.translate(
  'xpack.infra.metrics.alerting.tagsActionVariableDescription',
  {
    defaultMessage: 'List of tags associated with the entity where this alert triggered.',
  }
);

export const originalAlertStateActionVariableDescription = i18n.translate(
  'xpack.infra.metrics.alerting.originalAlertStateActionVariableDescription',
  {
    defaultMessage:
      'The state of the alert before it recovered. This is only available in the recovery context',
  }
);

export const originalAlertStateWasActionVariableDescription = i18n.translate(
  'xpack.infra.metrics.alerting.originalAlertStateWasWARNINGActionVariableDescription',
  {
    defaultMessage:
      'Boolean value of the state of the alert before it recovered. This can be used for template conditions. This is only available in the recovery context',
  }
);
