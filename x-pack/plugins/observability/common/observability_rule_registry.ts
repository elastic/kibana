/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { ecsFieldMap, pickWithPatterns } from '../../rule_registry/common';

export const observabilityRuleRegistrySettings = {
  name: 'observability',
  fieldMap: {
    ...pickWithPatterns(ecsFieldMap, 'host.name', 'service.name'),
  },
};

export const observabilityAlertRt = t.intersection([
  t.type({
    '@timestamp': t.string,
    'event.action': t.union([t.literal('close'), t.literal('active'), t.literal('open')]),
    'kibana.rac.alert.id': t.string,
    'kibana.rac.alert.uuid': t.string,
    'kibana.rac.alert.start': t.string,
    'kibana.rac.alert.duration.us': t.number,
    'rule.uuid': t.string,
    'rule.id': t.string,
    'rule.category': t.string,
    'rule.name': t.string,
  }),
  t.partial({
    'kibana.rac.alert.severity.level': t.string,
    'kibana.rac.alert.end': t.string,
  }),
]);
