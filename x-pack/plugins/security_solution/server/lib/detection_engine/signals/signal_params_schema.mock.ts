/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SignalParamsSchema } from './signal_params_schema';

export const getSignalParamsSchemaMock = (): Partial<SignalParamsSchema> => ({
  description: 'Detecting root and admin users',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'query',
  riskScore: 55,
  language: 'kuery',
  ruleId: 'rule-1',
  from: 'now-6m',
  to: 'now',
});

export const getSignalParamsSchemaDecodedMock = (): SignalParamsSchema => ({
  author: [],
  buildingBlockType: null,
  description: 'Detecting root and admin users',
  falsePositives: [],
  filters: null,
  from: 'now-6m',
  immutable: false,
  index: null,
  language: 'kuery',
  license: null,
  maxSignals: 100,
  meta: null,
  note: null,
  outputIndex: null,
  query: 'user.name: root or user.name: admin',
  references: [],
  riskScore: 55,
  riskScoreMapping: null,
  ruleNameOverride: null,
  ruleId: 'rule-1',
  savedId: null,
  severity: 'high',
  severityMapping: null,
  threat: null,
  timelineId: null,
  timelineTitle: null,
  timestampOverride: null,
  to: 'now',
  type: 'query',
  version: 1,
});
