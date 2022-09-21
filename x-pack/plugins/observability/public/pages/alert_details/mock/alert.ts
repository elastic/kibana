/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TopAlert } from '../../alerts';

export const tags: string[] = ['tag1', 'tag2', 'tag3'];

export const alert: TopAlert = {
  reason: '1957 log entries (more than 100.25) match the conditions.',
  fields: {
    'kibana.alert.status': 'active',
    '@timestamp': '2021-09-02T13:08:51.750Z',
    'kibana.alert.duration.us': 882076000,
    'kibana.alert.reason': '1957 log entries (more than 100.25) match the conditions.',
    'kibana.alert.workflow_status': 'open',
    'kibana.alert.rule.uuid': 'db2ab7c0-0bec-11ec-9ae2-5b10ca924404',
    'kibana.alert.rule.producer': 'logs',
    'kibana.alert.rule.consumer': 'logs',
    'kibana.alert.rule.category': 'Log threshold',
    'kibana.alert.start': '2021-09-02T12:54:09.674Z',
    'kibana.alert.rule.rule_type_id': 'logs.alert.document.count',
    'event.action': 'active',
    'kibana.alert.evaluation.value': 1957,
    'kibana.alert.instance.id': '*',
    'kibana.alert.rule.name': 'Log threshold (from logs)',
    'kibana.alert.uuid': '756240e5-92fb-452f-b08e-cd3e0dc51738',
    'kibana.space_ids': ['default'],
    'kibana.version': '8.0.0',
    'event.kind': 'signal',
    'kibana.alert.evaluation.threshold': 100.25,
    'kibana.alert.rule.tags': [],
  },
  active: true,
  start: 1630587249674,
  lastUpdated: 1630588131750,
};

export const alertWithTags: TopAlert = {
  ...alert,
  fields: {
    ...alert.fields,
    'kibana.alert.rule.tags': tags,
  },
};

export const alertWithNoData: TopAlert | null = null;
