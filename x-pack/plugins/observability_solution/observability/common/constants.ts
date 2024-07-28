/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertConsumers,
  APM_RULE_TYPE_IDS,
  SLO_BURN_RATE_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';
import type { ValidFeatureId } from '@kbn/rule-data-utils';
import type { RuleCreationValidConsumer } from '@kbn/triggers-actions-ui-plugin/public';
import { SYNTHETICS_RULE_TYPES } from '@kbn/synthetics-plugin/common/constants/synthetics_alerts';
import { UPTIME_RULE_TYPES } from '@kbn/uptime-plugin/common/constants/uptime_alerts';
import { INFRA_RULE_TYPE_IDS } from '@kbn/infra-plugin/common/alerting/metrics/types';
import { LOG_DOCUMENT_COUNT_RULE_TYPE_ID } from '@kbn/infra-plugin/common/alerting/logs/log_threshold/types';

export const INVALID_EQUATION_REGEX = /[^A-Z|+|\-|\s|\d+|\.|\(|\)|\/|\*|>|<|=|\?|\:|&|\!|\|]+/g;
export const ALERT_STATUS_ALL = 'all';
export const ALERTS_URL_STORAGE_KEY = '_a';

export const observabilityAlertFeatureIds: ValidFeatureId[] = [
  AlertConsumers.APM,
  AlertConsumers.INFRASTRUCTURE,
  AlertConsumers.LOGS,
  AlertConsumers.UPTIME,
  AlertConsumers.SLO,
  AlertConsumers.OBSERVABILITY,
  AlertConsumers.ALERTS,
];

export const observabilityRuleCreationValidConsumers: RuleCreationValidConsumer[] = [
  AlertConsumers.INFRASTRUCTURE,
  AlertConsumers.LOGS,
  AlertConsumers.OBSERVABILITY,
];

export const EventsAsUnit = 'events';

export const OBSERVABILITY_RULE_TYPE_IDS = [
  ...APM_RULE_TYPE_IDS,
  ...SYNTHETICS_RULE_TYPES,
  ...INFRA_RULE_TYPE_IDS,
  ...UPTIME_RULE_TYPES,
  LOG_DOCUMENT_COUNT_RULE_TYPE_ID,
  SLO_BURN_RATE_RULE_TYPE_ID,
];
