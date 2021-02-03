/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchStatus } from './types';
import { getSearchStatus } from './get_search_status';

describe('getSearchStatus', () => {
  let mockClient: any;
  beforeEach(() => {
    mockClient = {
      asyncSearch: {
        status: jest.fn(),
      },
    };
  });

  test('returns an error status if search is partial and not running', () => {
    mockClient.asyncSearch.status.mockResolvedValue({
      body: {
        is_partial: true,
        is_running: false,
        completion_status: 200,
      },
    });
    expect(getSearchStatus(mockClient, '123')).resolves.toBe(SearchStatus.ERROR);
  });

  test('returns an error status if completion_status is an error', () => {
    mockClient.asyncSearch.status.mockResolvedValue({
      body: {
        is_partial: false,
        is_running: false,
        completion_status: 500,
      },
    });
    expect(getSearchStatus(mockClient, '123')).resolves.toBe(SearchStatus.ERROR);
  });

  test('returns an error status if gets an ES error', () => {
    mockClient.asyncSearch.status.mockResolvedValue({
      error: {
        root_cause: {
          reason: 'not found',
        },
      },
    });
    expect(getSearchStatus(mockClient, '123')).resolves.toBe(SearchStatus.ERROR);
  });

  test('returns an error status throws', () => {
    mockClient.asyncSearch.status.mockRejectedValue(new Error('O_o'));
    expect(getSearchStatus(mockClient, '123')).resolves.toBe(SearchStatus.ERROR);
  });

  test('returns a complete status', () => {
    mockClient.asyncSearch.status.mockResolvedValue({
      body: {
        is_partial: false,
        is_running: false,
        completion_status: 200,
      },
    });
    expect(getSearchStatus(mockClient, '123')).resolves.toBe(SearchStatus.COMPLETE);
  });

  test('returns a running status otherwise', () => {
    mockClient.asyncSearch.status.mockResolvedValue({
      body: {
        is_partial: false,
        is_running: true,
        completion_status: undefined,
      },
    });
    expect(getSearchStatus(mockClient, '123')).resolves.toBe(SearchStatus.IN_PROGRESS);
  });
});
