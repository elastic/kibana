/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findObjectByTitle } from './find_object_by_title';
import { SimpleSavedObject } from '@kbn/core/public';
import { ContentClient } from '@kbn/content-management-plugin/public';

const mockFindContent = jest.fn(async () => ({
  pagination: { total: 0 },
  hits: [] as unknown[],
}));
const mockGetContent = jest.fn(async () => ({
  item: {
    id: 'test',
    references: [
      {
        id: 'test',
        type: 'index-pattern',
      },
    ],
    attributes: {
      visState: JSON.stringify({ type: 'area' }),
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{filter: []}',
      },
    },
    _version: '1',
  },
  meta: {
    outcome: 'exact',
    alias_target_id: null,
  },
}));
const mockCreateContent = jest.fn(async (input: any) => ({
  item: {
    id: 'test',
  },
}));

const mockUpdateContent = jest.fn(() => ({
  item: {
    id: 'test',
  },
}));

const contentClientMock = {
  create: mockCreateContent,
  update: mockUpdateContent,
  get: mockGetContent,
  search: mockFindContent,
} as unknown as ContentClient;

describe('findObjectByTitle', () => {
  beforeEach(() => {
    mockFindContent.mockClear();
  });

  it('returns undefined if title is not provided', async () => {
    const match = await findObjectByTitle(contentClientMock, '');
    expect(match).toBeUndefined();
  });

  it('matches any case', async () => {
    const indexPattern = {
      attributes: { title: 'foo' },
    } as SimpleSavedObject;

    mockFindContent.mockImplementation(async () => ({
      hits: [indexPattern],
      pagination: { total: 1 },
    }));
    const match = await findObjectByTitle(contentClientMock, 'FOO');
    expect(match).toEqual(indexPattern);
  });
});
