/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

const AUDIT_LOG_DATA_STREAM = 'logs-fleet.audit_logs-generic';

export interface AuditLogDocument {
  '@timestamp': string;
  username: string;
  resource_type: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
}

/**
 * Provides an interface for logging change operations to Fleet's audit logging datastream
 */
export async function recordAuditLog({
  esClient,
  username,
  resourceType,
  operation,
}: {
  esClient: ElasticsearchClient;
  username: string;
  resourceType: string;
  operation: AuditLogDocument['operation'];
}) {
  const document: AuditLogDocument = {
    '@timestamp': new Date().toISOString(),
    username,
    resource_type: resourceType,
    operation,
  };

  await esClient.transport.request({
    method: 'POST',
    path: `${AUDIT_LOG_DATA_STREAM}/_doc`,
    body: {
      ...document,
    },
  });
}
