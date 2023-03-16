/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalSourceHit } from '../../types';
import type { ThreatMatchNamedQuery } from './types';

export const getNamedQueryMock = (
  overrides: Partial<ThreatMatchNamedQuery> = {}
): ThreatMatchNamedQuery => ({
  id: 'id',
  index: 'index',
  field: 'field',
  value: 'value',
  queryType: 'mq',
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
