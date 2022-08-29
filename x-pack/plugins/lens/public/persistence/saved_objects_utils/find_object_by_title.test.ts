/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findObjectByTitle } from './find_object_by_title';
import { SavedObjectsClientContract, SimpleSavedObject } from '@kbn/core/public';
import { simpleSavedObjectMock } from '@kbn/core/public/mocks';

describe('findObjectByTitle', () => {
  const savedObjectsClient: SavedObjectsClientContract = {} as SavedObjectsClientContract;

  beforeEach(() => {
    savedObjectsClient.find = jest.fn();
  });

  it('returns undefined if title is not provided', async () => {
    const match = await findObjectByTitle(savedObjectsClient, 'index-pattern', '');
    expect(match).toBeUndefined();
  });

  it('matches any case', async () => {
    const indexPattern = simpleSavedObjectMock.create(savedObjectsClient, {
      attributes: { title: 'foo' },
    } as SimpleSavedObject);

    savedObjectsClient.find = jest.fn().mockImplementation(() =>
      Promise.resolve({
        savedObjects: [indexPattern],
      })
    );
    const match = await findObjectByTitle(savedObjectsClient, 'index-pattern', 'FOO');
    expect(match).toEqual(indexPattern);
  });
});
