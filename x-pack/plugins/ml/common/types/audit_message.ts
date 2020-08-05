/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface AuditMessageBase {
  message: string;
  level: string;
  timestamp: number;
  node_name: string;
  text?: string;
}

export interface JobMessage extends AuditMessageBase {
  job_id: string;
}
