/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const apmRuleFieldMap = {
  'service.environment': {
    type: 'keyword',
  },
  'transaction.type': {
    type: 'keyword',
  },
  'processor.event': {
    type: 'keyword',
  },
} as const;

export type APMRuleFieldMap = typeof apmRuleFieldMap;
