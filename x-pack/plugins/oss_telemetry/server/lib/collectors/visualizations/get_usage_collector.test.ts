/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { HapiServer } from '../../../../';
import {
  getMockCallWithInternal,
  getMockKbnServer,
  getMockTaskFetch,
} from '../../../../test_utils';
import { getUsageCollector } from './get_usage_collector';

describe('getVisualizationsCollector#fetch', () => {
  let mockKbnServer: HapiServer;

  beforeEach(() => {
    mockKbnServer = getMockKbnServer(getMockCallWithInternal(), getMockTaskFetch());
  });

  test('can return empty stats', async () => {
    const { type, fetch } = getUsageCollector(mockKbnServer);
    expect(type).toBe('visualization_types');
    const fetchResult = await fetch();
    expect(fetchResult).toEqual({});
  });

  test('provides known stats', async () => {
    const mockTaskFetch = getMockTaskFetch([
      {
        state: {
          runs: 1,
          stats: { comic_books: { total: 16, max: 12, min: 2, avg: 6 } },
        },
      },
    ]);
    mockKbnServer = getMockKbnServer(getMockCallWithInternal(), mockTaskFetch);

    const { type, fetch } = getUsageCollector(mockKbnServer);
    expect(type).toBe('visualization_types');
    const fetchResult = await fetch();
    expect(fetchResult).toEqual({ comic_books: { avg: 6, max: 12, min: 2, total: 16 } });
  });

  describe('Error handling', () => {
    test('Silently handles Task Manager NotInitialized', async () => {
      const mockTaskFetch = sinon.stub();
      mockTaskFetch.rejects(
        new Error('NotInitialized taskManager is still waiting for plugins to load')
      );
      mockKbnServer = getMockKbnServer(getMockCallWithInternal(), mockTaskFetch);

      const { fetch } = getUsageCollector(mockKbnServer);
      await expect(fetch()).resolves.toBe(undefined);
    });
    // In real life, the CollectorSet calls fetch and handles errors
    test('defers the errors', async () => {
      const mockTaskFetch = sinon.stub();
      mockTaskFetch.rejects(new Error('BOOM'));
      mockKbnServer = getMockKbnServer(getMockCallWithInternal(), mockTaskFetch);

      const { fetch } = getUsageCollector(mockKbnServer);
      await expect(fetch()).rejects.toMatchObject(new Error('BOOM'));
    });
  });
});
