/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const uptimeRuleFieldMap = {
  'monitor.id': {
    type: 'keyword',
  },
  'monitor.url': {
    type: 'keyword',
  },
  'monitor.name': {
    type: 'keyword',
  },
  'monitor.type': {
    type: 'keyword',
  },
  reason: {
    type: 'text',
  },
  'observer.geo.name': {
    type: 'keyword',
  },
  'error.message': {
    type: 'text',
  },
} as const;

export type UptimeRuleFieldMap = typeof uptimeRuleFieldMap;
