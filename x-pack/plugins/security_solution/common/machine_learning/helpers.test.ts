/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isJobStarted, isJobLoading, isJobFailed } from './helpers';

describe('isJobStarted', () => {
  test('returns false if only jobState is enabled', () => {
    expect(isJobStarted('started', 'closing')).toBe(false);
  });

  test('returns false if only datafeedState is enabled', () => {
    expect(isJobStarted('stopping', 'opened')).toBe(false);
  });

  test('returns true if both enabled states are provided', () => {
    expect(isJobStarted('started', 'opened')).toBe(true);
  });
});

describe('isJobLoading', () => {
  test('returns true if both loading states are not provided', () => {
    expect(isJobLoading('started', 'closing')).toBe(true);
  });

  test('returns true if only jobState is loading', () => {
    expect(isJobLoading('starting', 'opened')).toBe(true);
  });

  test('returns true if only datafeedState is loading', () => {
    expect(isJobLoading('started', 'opening')).toBe(true);
  });

  test('returns false if both disabling states are provided', () => {
    expect(isJobLoading('stopping', 'closing')).toBe(true);
  });
});

describe('isJobFailed', () => {
  test('returns true if only jobState is failure/deleted', () => {
    expect(isJobFailed('failed', 'stopping')).toBe(true);
  });

  test('returns true if only dataFeed is failure/deleted', () => {
    expect(isJobFailed('started', 'deleted')).toBe(true);
  });

  test('returns true if both enabled states are failure/deleted', () => {
    expect(isJobFailed('failed', 'deleted')).toBe(true);
  });

  test('returns false only if both states are not failure/deleted', () => {
    expect(isJobFailed('opened', 'stopping')).toBe(false);
  });
});
