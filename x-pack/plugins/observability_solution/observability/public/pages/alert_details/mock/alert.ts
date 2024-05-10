/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_DURATION,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_INSTANCE_ID,
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_NAME,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_REVISION,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_UNTRACKED,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  EVENT_ACTION,
  EVENT_KIND,
  SPACE_IDS,
  TIMESTAMP,
  VERSION,
} from '@kbn/rule-data-utils';
import { AlertData } from '../../../hooks/use_fetch_alert_detail';
import type { TopAlert } from '../../../typings/alerts';

export const tags: string[] = ['tag1', 'tag2', 'tag3'];

export const mockAlertUuid = '756240e5-92fb-452f-b08e-cd3e0dc51738';

export const alert: TopAlert = {
  reason: '1957 log entries (more than 100.25) match the conditions.',
  fields: {
    [ALERT_STATUS]: 'active',
    [TIMESTAMP]: '2021-09-02T13:08:51.750Z',
    [ALERT_DURATION]: 882076000,
    [ALERT_REASON]: '1957 log entries (more than 100.25) match the conditions.',
    [ALERT_WORKFLOW_STATUS]: 'open',
    [ALERT_RULE_UUID]: 'db2ab7c0-0bec-11ec-9ae2-5b10ca924404',
    [ALERT_RULE_PRODUCER]: 'logs',
    [ALERT_RULE_CONSUMER]: 'logs',
    [ALERT_RULE_CATEGORY]: 'Log threshold',
    [ALERT_RULE_REVISION]: 0,
    [ALERT_START]: '2021-09-02T12:54:09.674Z',
    [ALERT_RULE_TYPE_ID]: 'logs.alert.document.count',
    [EVENT_ACTION]: 'active',
    [ALERT_EVALUATION_VALUE]: 1957,
    [ALERT_INSTANCE_ID]: '*',
    [ALERT_RULE_NAME]: 'Log threshold (from logs)',
    [ALERT_UUID]: mockAlertUuid,
    [SPACE_IDS]: ['default'],
    [VERSION]: '8.0.0',
    [EVENT_KIND]: 'signal',
    [ALERT_EVALUATION_THRESHOLD]: 100.25,
    [ALERT_RULE_TAGS]: [],
  },
  active: true,
  start: 1630587249674,
  lastUpdated: 1630588131750,
};

export const alertDetail: AlertData = {
  formatted: alert,
  raw: Object.fromEntries(
    Object.entries(alert.fields).map(([k, v]) => [k, !Array.isArray(v) ? [v] : v])
  ) as unknown as AlertData['raw'],
};

export const alertWithTags: TopAlert = {
  ...alert,
  fields: {
    ...alert.fields,
    [ALERT_RULE_TAGS]: tags,
  },
};

export const untrackedAlert: TopAlert = {
  ...alertWithTags,
  fields: {
    ...alertWithTags.fields,
    [ALERT_STATUS]: ALERT_STATUS_UNTRACKED,
  },
};

export const alertWithNoData: TopAlert | null = null;
