/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertConsumers,
  OBSERVABILITY_RULE_TYPE_IDS,
  STACK_RULE_TYPE_IDS_SUPPORTED_BY_OBSERVABILITY,
  type ValidFeatureId,
} from '@kbn/rule-data-utils';

export const APM_ALERTING_CONSUMERS: ValidFeatureId[] = [
  AlertConsumers.LOGS,
  AlertConsumers.APM,
  AlertConsumers.SLO,
  AlertConsumers.OBSERVABILITY,
  AlertConsumers.INFRASTRUCTURE,
  AlertConsumers.ALERTS,
  AlertConsumers.STACK_ALERTS,
  AlertConsumers.ML,
];

export const APM_ALERTING_RULE_TYPE_IDS: string[] = [
  ...OBSERVABILITY_RULE_TYPE_IDS,
  ...STACK_RULE_TYPE_IDS_SUPPORTED_BY_OBSERVABILITY,
];
