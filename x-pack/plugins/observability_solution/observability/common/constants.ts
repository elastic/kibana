/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AlertConsumers } from '@kbn/rule-data-utils';
import type { ValidFeatureId } from '@kbn/rule-data-utils';
import type { RuleCreationValidConsumer } from '@kbn/triggers-actions-ui-plugin/public';

export const SLO_BURN_RATE_RULE_TYPE_ID = 'slo.rules.burnRate';

export const INVALID_EQUATION_REGEX = /[^A-Z|+|\-|\s|\d+|\.|\(|\)|\/|\*|>|<|=|\?|\:|&|\!|\|]+/g;
export const ALERT_STATUS_ALL = 'all';
export const ALERTS_URL_STORAGE_KEY = '_a';

export const ALERT_ACTION_ID = 'slo.burnRate.alert';
export const ALERT_ACTION = {
  id: ALERT_ACTION_ID,
  name: i18n.translate('xpack.observability.slo.alerting.burnRate.alertAction', {
    defaultMessage: 'Critical',
  }),
};

export const HIGH_PRIORITY_ACTION_ID = 'slo.burnRate.high';
export const HIGH_PRIORITY_ACTION = {
  id: HIGH_PRIORITY_ACTION_ID,
  name: i18n.translate('xpack.observability.slo.alerting.burnRate.highPriorityAction', {
    defaultMessage: 'High',
  }),
};

export const MEDIUM_PRIORITY_ACTION_ID = 'slo.burnRate.medium';
export const MEDIUM_PRIORITY_ACTION = {
  id: MEDIUM_PRIORITY_ACTION_ID,
  name: i18n.translate('xpack.observability.slo.alerting.burnRate.mediumPriorityAction', {
    defaultMessage: 'Medium',
  }),
};

export const LOW_PRIORITY_ACTION_ID = 'slo.burnRate.low';
export const LOW_PRIORITY_ACTION = {
  id: LOW_PRIORITY_ACTION_ID,
  name: i18n.translate('xpack.observability.slo.alerting.burnRate.lowPriorityAction', {
    defaultMessage: 'Low',
  }),
};

export const observabilityAlertFeatureIds: ValidFeatureId[] = [
  AlertConsumers.APM,
  AlertConsumers.INFRASTRUCTURE,
  AlertConsumers.LOGS,
  AlertConsumers.UPTIME,
  AlertConsumers.SLO,
  AlertConsumers.OBSERVABILITY,
];

export const observabilityRuleCreationValidConsumers: RuleCreationValidConsumer[] = [
  AlertConsumers.INFRASTRUCTURE,
  AlertConsumers.LOGS,
  AlertConsumers.OBSERVABILITY,
];

export const EventsAsUnit = 'events';
