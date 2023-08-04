/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Comparator } from '../../../../common/threshold_rule/types';
import { formatDurationFromTimeUnitChar, TimeUnitChar } from '../../../../common';
import { UNGROUPED_FACTORY_KEY } from './utils';

export const DOCUMENT_COUNT_I18N = i18n.translate(
  'xpack.observability.threshold.rule.threshold.documentCount',
  {
    defaultMessage: 'Document count',
  }
);

export const CUSTOM_EQUATION_I18N = i18n.translate(
  'xpack.observability.threshold.rule.threshold.customEquation',
  {
    defaultMessage: 'Custom equation',
  }
);

const toNumber = (value: number | string) =>
  typeof value === 'string' ? parseFloat(value) : value;

const recoveredComparatorToI18n = (
  comparator: Comparator,
  threshold: number[],
  currentValue: number
) => {
  const belowText = i18n.translate('xpack.observability.threshold.rule.threshold.belowRecovery', {
    defaultMessage: 'below',
  });
  const aboveText = i18n.translate('xpack.observability.threshold.rule.threshold.aboveRecovery', {
    defaultMessage: 'above',
  });
  switch (comparator) {
    case Comparator.BETWEEN:
      return currentValue < threshold[0] ? belowText : aboveText;
    case Comparator.OUTSIDE_RANGE:
      return i18n.translate('xpack.observability.threshold.rule.threshold.betweenRecovery', {
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
  return i18n.translate('xpack.observability.threshold.rule.threshold.thresholdRange', {
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
  i18n.translate('xpack.observability.threshold.rule.threshold.firedAlertReason', {
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
  i18n.translate('xpack.observability.threshold.rule.threshold.recoveredAlertReason', {
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
  i18n.translate('xpack.observability.threshold.rule.threshold.noDataAlertReason', {
    defaultMessage: '{metric} reported no data in the last {interval}{group}',
    values: {
      metric,
      interval: `${timeSize}${timeUnit}`,
      group: formatGroup(group),
    },
  });

export const buildErrorAlertReason = (metric: string) =>
  i18n.translate('xpack.observability.threshold.rule.threshold.errorAlertReason', {
    defaultMessage: 'Elasticsearch failed when attempting to query data for {metric}',
    values: {
      metric,
    },
  });

export const groupByKeysActionVariableDescription = i18n.translate(
  'xpack.observability.threshold.rule.groupByKeysActionVariableDescription',
  {
    defaultMessage: 'The object containing groups that are reporting data',
  }
);

export const alertDetailUrlActionVariableDescription = i18n.translate(
  'xpack.observability.threshold.rule.alertDetailUrlActionVariableDescription',
  {
    defaultMessage:
      'Link to the alert troubleshooting view for further context and details. This will be an empty string if the server.publicBaseUrl is not configured.',
  }
);

export const reasonActionVariableDescription = i18n.translate(
  'xpack.observability.threshold.rule.reasonActionVariableDescription',
  {
    defaultMessage: 'A concise description of the reason for the alert',
  }
);

export const timestampActionVariableDescription = i18n.translate(
  'xpack.observability.threshold.rule.timestampDescription',
  {
    defaultMessage: 'A timestamp of when the alert was detected.',
  }
);

export const valueActionVariableDescription = i18n.translate(
  'xpack.observability.threshold.rule.valueActionVariableDescription',
  {
    defaultMessage: 'List of the condition values.',
  }
);

export const viewInAppUrlActionVariableDescription = i18n.translate(
  'xpack.observability.threshold.rule.viewInAppUrlActionVariableDescription',
  {
    defaultMessage: 'Link to the alert source',
  }
);

export const cloudActionVariableDescription = i18n.translate(
  'xpack.observability.threshold.rule.cloudActionVariableDescription',
  {
    defaultMessage: 'The cloud object defined by ECS if available in the source.',
  }
);

export const hostActionVariableDescription = i18n.translate(
  'xpack.observability.threshold.rule.hostActionVariableDescription',
  {
    defaultMessage: 'The host object defined by ECS if available in the source.',
  }
);

export const containerActionVariableDescription = i18n.translate(
  'xpack.observability.threshold.rule.containerActionVariableDescription',
  {
    defaultMessage: 'The container object defined by ECS if available in the source.',
  }
);

export const orchestratorActionVariableDescription = i18n.translate(
  'xpack.observability.threshold.rule.orchestratorActionVariableDescription',
  {
    defaultMessage: 'The orchestrator object defined by ECS if available in the source.',
  }
);

export const labelsActionVariableDescription = i18n.translate(
  'xpack.observability.threshold.rule.labelsActionVariableDescription',
  {
    defaultMessage: 'List of labels associated with the entity where this alert triggered.',
  }
);

export const tagsActionVariableDescription = i18n.translate(
  'xpack.observability.threshold.rule.tagsActionVariableDescription',
  {
    defaultMessage: 'List of tags associated with the entity where this alert triggered.',
  }
);
