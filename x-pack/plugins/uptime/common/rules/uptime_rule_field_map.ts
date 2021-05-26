/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const uptimeRuleFieldMap = {
  // common fields
  'monitor.id': {
    type: 'keyword',
  },
  'url.full': {
    type: 'keyword',
  },
  reason: {
    type: 'text',
  },
  // monitor status alert fields
  'error.message': {
    type: 'text',
  },
  'agent.name': {
    type: 'keyword',
  },
  'monitor.name': {
    type: 'keyword',
  },
  'monitor.type': {
    type: 'keyword',
  },
  'observer.geo.name': {
    type: 'keyword',
  },
  // tls alert fields
  'cert_status.count': {
    type: 'integer',
  },
  'cert_status.aging_count': {
    type: 'integer',
  },
  'cert_status.aging_common_name_and_date': {
    type: 'text',
  },
  'cert_status.expiring_count': {
    type: 'integer',
  },
  'cert_status.expiring_common_name_and_date': {
    type: 'text',
  },
  'cert_status.has_aging': {
    type: 'boolean',
  },
  'cert_status.has_expired': {
    type: 'boolean',
  },
  // anomaly alert fields
  'anomaly.severity': {
    type: 'keyword',
  },
  'anomaly.severity_score': {
    type: 'double',
  },
  'anomaly.start': {
    type: 'date',
  },
  'anomaly.slowest_response': {
    type: 'double',
  },
  'anomaly.expected_response': {
    type: 'double',
  },
  'anomaly.observer_location': {
    type: 'keyword',
  },
} as const;

export type UptimeRuleFieldMap = typeof uptimeRuleFieldMap;
