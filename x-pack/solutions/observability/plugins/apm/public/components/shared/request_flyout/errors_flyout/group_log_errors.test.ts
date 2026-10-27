/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupLogErrors } from './group_log_errors';

const row = (id: string, type: string, message: string, timestampUs: number) => ({
  id,
  type,
  message,
  timestampUs,
});

describe('groupLogErrors', () => {
  it('groups rows by type and message and counts them', () => {
    const groups = groupLogErrors([
      row('1', 'TimeoutError', 'timed out', 10),
      row('2', 'TimeoutError', 'timed out', 30),
      row('3', 'TimeoutError', 'other message', 20),
    ]);

    expect(groups.map((g) => [g.type, g.message, g.count])).toEqual([
      ['TimeoutError', 'timed out', 2],
      ['TimeoutError', 'other message', 1],
    ]);
  });

  it('keeps the most recent row as the sample', () => {
    const [group] = groupLogErrors([
      row('old', 'E', 'm', 10),
      row('new', 'E', 'm', 30),
      row('mid', 'E', 'm', 20),
    ]);

    expect(group.sample.id).toBe('new');
    expect(group.lastSeenUs).toBe(30);
  });

  it('orders by count, then by recency', () => {
    const groups = groupLogErrors([
      row('1', 'A', 'a', 100),
      row('2', 'B', 'b', 200),
      row('3', 'C', 'c', 50),
      row('4', 'C', 'c', 60),
    ]);

    expect(groups.map((g) => g.type)).toEqual(['C', 'B', 'A']);
  });

  it('returns an empty list for no rows', () => {
    expect(groupLogErrors([])).toEqual([]);
  });
});
