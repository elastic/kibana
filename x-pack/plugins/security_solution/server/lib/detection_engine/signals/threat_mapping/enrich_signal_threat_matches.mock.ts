/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SignalSearchResponse, SignalSourceHit } from '../types';
import { ThreatMatchNamedQuery } from './types';

export const getNamedQueryMock = (
  overrides: Partial<ThreatMatchNamedQuery> = {}
): ThreatMatchNamedQuery => ({
  id: 'id',
  index: 'index',
  field: 'field',
  value: 'value',
  ...overrides,
});

export const getSignalHitMock = (overrides: Partial<SignalSourceHit> = {}): SignalSourceHit => ({
  _id: '_id',
  _index: '_index',
  _source: {
    '@timestamp': '2020-11-20T15:35:28.373Z',
  },
  _score: 0,
  ...overrides,
});

export const getSignalsResponseMock = (signals: SignalSourceHit[] = []): SignalSearchResponse => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { total: { value: signals.length, relation: 'eq' }, max_score: 0, hits: signals },
});
