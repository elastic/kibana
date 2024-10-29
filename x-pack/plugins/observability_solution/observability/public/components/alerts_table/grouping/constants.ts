/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ALERT_RULE_NAME, ALERT_INSTANCE_ID } from '@kbn/rule-data-utils';

export const ungrouped = i18n.translate('xpack.observability.alert.grouping.ungrouped.label', {
  defaultMessage: 'Ungrouped',
});

export const ruleName = i18n.translate('xpack.observability.alert.grouping.ruleName.label', {
  defaultMessage: 'Rule name',
});

export const source = i18n.translate('xpack.observability.alert.grouping.source.label', {
  defaultMessage: 'Source',
});

export const DEFAULT_GROUPING_OPTIONS = [
  {
    label: ruleName,
    key: ALERT_RULE_NAME,
  },
  {
    label: source,
    key: ALERT_INSTANCE_ID,
  },
];
