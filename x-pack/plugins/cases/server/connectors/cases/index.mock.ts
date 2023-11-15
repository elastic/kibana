/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OracleRecord, OracleRecordError } from './types';

export const oracleRecord: OracleRecord = {
  id: 'so-id',
  version: 'so-version',
  cases: [{ id: 'test-case-id' }],
  rules: [{ id: 'test-rule-id' }],
  grouping: { 'host.ip': '0.0.0.1', 'agent.id': '8a4f500d' },
  counter: 1,
  createdAt: '2023-10-10T10:23:42.769Z',
  updatedAt: '2023-10-10T10:23:42.769Z',
};

export const oracleRecordError: OracleRecordError = {
  id: 'so-id',
  error: 'An error',
  statusCode: 404,
  message: 'An error',
};
