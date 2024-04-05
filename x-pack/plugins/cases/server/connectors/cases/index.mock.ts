/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Cases } from '../../../common';
import { CASE_RULES_SAVED_OBJECT } from '../../../common/constants';
import { mockCases } from '../../mocks';
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

export const alerts = [
  {
    _id: 'alert-id-0',
    _index: 'alert-index-0',
    'host.name': 'A',
    'dest.ip': '0.0.0.1',
    'source.ip': '0.0.0.2',
  },
  {
    _id: 'alert-id-1',
    _index: 'alert-index-1',
    'host.name': 'B',
    'dest.ip': '0.0.0.1',
    'file.hash': '12345',
  },
  { _id: 'alert-id-2', _index: 'alert-index-2', 'host.name': 'A', 'dest.ip': '0.0.0.1' },
  { _id: 'alert-id-3', _index: 'alert-index-3', 'host.name': 'B', 'dest.ip': '0.0.0.3' },
  { _id: 'alert-id-4', _index: 'alert-index-4', 'host.name': 'A', 'source.ip': '0.0.0.5' },
];

export const alertsNested = [
  {
    _id: 'alert-id-0',
    _index: 'alert-index-0',
    host: { name: 'A' },
    dest: { ip: '0.0.0.1' },
    source: { ip: '0.0.0.2' },
  },
  {
    _id: 'alert-id-1',
    _index: 'alert-index-1',
    host: { name: 'B' },
    dest: { ip: '0.0.0.1' },
    file: { hash: '12345' },
  },
  {
    _id: 'alert-id-2',
    _index: 'alert-index-2',
    host: { name: 'A' },
    dest: { ip: '0.0.0.1' },
  },
  {
    _id: 'alert-id-3',
    _index: 'alert-index-3',
    host: { name: 'B' },
    dest: { ip: '0.0.0.3' },
  },
  {
    _id: 'alert-id-4',
    _index: 'alert-index-4',
    host: { name: 'A' },
    source: { ip: '0.0.0.5' },
  },
];

export const groupingBy = ['host.name', 'dest.ip'];
export const rule = {
  id: 'rule-test-id',
  name: 'Test rule',
  tags: ['rule', 'test'],
  ruleUrl: 'https://example.com/rules/rule-test-id',
};

export const owner = 'cases';
export const timeWindow = '7d';
export const reopenClosedCases = false;

export const groupedAlertsWithOracleKey = [
  {
    alerts: [alerts[0], alerts[2]],
    grouping: { 'host.name': 'A', 'dest.ip': '0.0.0.1' },
    oracleKey: 'so-oracle-record-0',
  },
  {
    alerts: [alerts[1]],
    grouping: { 'host.name': 'B', 'dest.ip': '0.0.0.1' },
    oracleKey: 'so-oracle-record-1',
  },
  {
    alerts: [alerts[3]],
    grouping: { 'host.name': 'B', 'dest.ip': '0.0.0.3' },
    oracleKey: 'so-oracle-record-2',
  },
];

export const oracleRecords = [
  {
    id: groupedAlertsWithOracleKey[0].oracleKey,
    version: 'so-version-0',
    counter: 1,
    cases: [],
    rules: [],
    grouping: groupedAlertsWithOracleKey[0].grouping,
    createdAt: '2023-10-10T10:23:42.769Z',
    updatedAt: '2023-10-10T10:23:42.769Z',
  },
  {
    id: groupedAlertsWithOracleKey[1].oracleKey,
    version: 'so-version-1',
    counter: 1,
    cases: [],
    rules: [],
    grouping: groupedAlertsWithOracleKey[1].grouping,
    createdAt: '2023-10-12T10:23:42.769Z',
    updatedAt: '2023-10-12T10:23:42.769Z',
  },
  {
    id: groupedAlertsWithOracleKey[2].oracleKey,
    type: CASE_RULES_SAVED_OBJECT,
    message: 'Not found',
    statusCode: 404,
    error: 'Not found',
  },
];

export const createdOracleRecord = {
  ...oracleRecords[0],
  id: groupedAlertsWithOracleKey[2].oracleKey,
  grouping: groupedAlertsWithOracleKey[2].grouping,
  version: 'so-version-2',
  createdAt: '2023-11-13T10:23:42.769Z',
  updatedAt: '2023-11-13T10:23:42.769Z',
};

export const updatedCounterOracleRecord = {
  ...oracleRecords[0],
  // another node increased the counter
  counter: 2,
  id: groupedAlertsWithOracleKey[0].oracleKey,
  grouping: groupedAlertsWithOracleKey[0].grouping,
  version: 'so-version-3',
  createdAt: '2023-11-13T10:23:42.769Z',
  updatedAt: '2023-11-13T10:23:42.769Z',
};

export const cases: Cases = mockCases.map((so) => ({
  ...so.attributes,
  id: so.id,
  version: so.version ?? '',
  totalComment: 0,
  totalAlerts: 0,
}));
