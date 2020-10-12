/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import { ITagsCache, ITagsChangeListener } from './tags_cache';

type TagsCacheMock = jest.Mocked<ITagsCache & ITagsChangeListener>;

const createTagsCacheMock = (): TagsCacheMock => {
  const mock = {
    getState: jest.fn(),
    getState$: jest.fn(),

    onDelete: jest.fn(),
    onCreate: jest.fn(),
    onUpdate: jest.fn(),
    onGetAll: jest.fn(),
  };

  mock.getState.mockReturnValue([]);
  mock.getState$.mockReturnValue(of([]));

  return mock;
};

export const tagsCacheMock = {
  create: createTagsCacheMock,
};
