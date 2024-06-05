/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DOCUMENT_COUNT_I18N = i18n.translate(
  'xpack.observability.customThreshold.rule.aggregators.documentCount',
  {
    defaultMessage: 'Document count',
  }
);

export const AVERAGE_I18N = (metric: string) =>
  i18n.translate('xpack.observability.customThreshold.rule.aggregators.average', {
    defaultMessage: 'Average {metric}',
    values: {
      metric,
    },
  });

export const PERCENTILE_99_I18N = (metric: string) =>
  i18n.translate('xpack.observability.customThreshold.rule.aggregators.p99', {
    defaultMessage: '99th percentile of {metric}',
    values: {
      metric,
    },
  });

export const PERCENTILE_95_I18N = (metric: string) =>
  i18n.translate('xpack.observability.customThreshold.rule.aggregators.p95', {
    defaultMessage: '95th percentile of {metric}',
    values: {
      metric,
    },
  });

export const RATE_I18N = (metric: string) =>
  i18n.translate('xpack.observability.customThreshold.rule.aggregators.rate', {
    defaultMessage: 'Rate of {metric}',
    values: {
      metric,
    },
  });

export const MAX_I18N = (metric: string) =>
  i18n.translate('xpack.observability.customThreshold.rule.aggregators.max', {
    defaultMessage: 'Max {metric}',
    values: {
      metric,
    },
  });

export const MIN_I18N = (metric: string) =>
  i18n.translate('xpack.observability.customThreshold.rule.aggregators.min', {
    defaultMessage: 'Min {metric}',
    values: {
      metric,
    },
  });

export const CARDINALITY_I18N = (metric: string) =>
  i18n.translate('xpack.observability.customThreshold.rule.aggregators.cardinality', {
    defaultMessage: 'Cardinality of the {metric}',
    values: {
      metric,
    },
  });

export const SUM_I18N = (metric: string) =>
  i18n.translate('xpack.observability.customThreshold.rule.aggregators.sum', {
    defaultMessage: 'Sum of the {metric}',
    values: {
      metric,
    },
  });

export const CUSTOM_EQUATION_I18N = i18n.translate(
  'xpack.observability.customThreshold.rule.aggregators.customEquation',
  {
    defaultMessage: 'Custom equation',
  }
);

// Action variable descriptions

export const groupByKeysActionVariableDescription = i18n.translate(
  'xpack.observability.customThreshold.rule.groupByKeysActionVariableDescription',
  {
    defaultMessage: 'The object containing groups that are reporting data',
  }
);

export const alertDetailUrlActionVariableDescription = i18n.translate(
  'xpack.observability.customThreshold.rule.alertDetailUrlActionVariableDescription',
  {
    defaultMessage:
      'Link to the alert troubleshooting view for further context and details. This will be an empty string if the server.publicBaseUrl is not configured.',
  }
);

export const reasonActionVariableDescription = i18n.translate(
  'xpack.observability.customThreshold.rule.reasonActionVariableDescription',
  {
    defaultMessage: 'A concise description of the reason for the alert',
  }
);

export const timestampActionVariableDescription = i18n.translate(
  'xpack.observability.customThreshold.rule.timestampDescription',
  {
    defaultMessage: 'A timestamp of when the alert was detected.',
  }
);

export const valueActionVariableDescription = i18n.translate(
  'xpack.observability.customThreshold.rule.valueActionVariableDescription',
  {
    defaultMessage: 'List of the condition values.',
  }
);

export const viewInAppUrlActionVariableDescription = i18n.translate(
  'xpack.observability.customThreshold.rule.viewInAppUrlActionVariableDescription',
  {
    defaultMessage: 'Link to the alert source',
  }
);

export const cloudActionVariableDescription = i18n.translate(
  'xpack.observability.customThreshold.rule.cloudActionVariableDescription',
  {
    defaultMessage: 'The cloud object defined by ECS if available in the source.',
  }
);

export const hostActionVariableDescription = i18n.translate(
  'xpack.observability.customThreshold.rule.hostActionVariableDescription',
  {
    defaultMessage: 'The host object defined by ECS if available in the source.',
  }
);

export const containerActionVariableDescription = i18n.translate(
  'xpack.observability.customThreshold.rule.containerActionVariableDescription',
  {
    defaultMessage: 'The container object defined by ECS if available in the source.',
  }
);

export const orchestratorActionVariableDescription = i18n.translate(
  'xpack.observability.customThreshold.rule.orchestratorActionVariableDescription',
  {
    defaultMessage: 'The orchestrator object defined by ECS if available in the source.',
  }
);

export const labelsActionVariableDescription = i18n.translate(
  'xpack.observability.customThreshold.rule.labelsActionVariableDescription',
  {
    defaultMessage: 'List of labels associated with the entity where this alert triggered.',
  }
);

export const tagsActionVariableDescription = i18n.translate(
  'xpack.observability.customThreshold.rule.tagsActionVariableDescription',
  {
    defaultMessage: 'List of tags associated with the entity where this alert triggered.',
  }
);
