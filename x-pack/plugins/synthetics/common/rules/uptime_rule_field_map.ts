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
  'observer.geo.name': {
    type: 'keyword',
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
  // tls alert fields
  'tls.server.x509.issuer.common_name': {
    type: 'keyword',
  },
  'tls.server.x509.subject.common_name': {
    type: 'keyword',
  },
  'tls.server.x509.not_after': {
    type: 'date',
  },
  'tls.server.x509.not_before': {
    type: 'date',
  },
  'tls.server.hash.sha256': {
    type: 'keyword',
  },
  // anomaly alert fields
  'anomaly.start': {
    type: 'date',
  },
  'anomaly.bucket_span.minutes': {
    type: 'keyword',
  },
} as const;

export type UptimeRuleFieldMap = typeof uptimeRuleFieldMap;
