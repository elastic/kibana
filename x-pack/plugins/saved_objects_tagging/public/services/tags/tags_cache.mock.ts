/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import { PublicMethodsOf } from '@kbn/utility-types';
import { TagsCache } from './tags_cache';

type TagsCacheMock = jest.Mocked<PublicMethodsOf<TagsCache>>;

const createTagsCacheMock = () => {
  const mock: TagsCacheMock = {
    getState: jest.fn(),
    getState$: jest.fn(),
    initialize: jest.fn(),
    stop: jest.fn(),

    onDelete: jest.fn(),
    onCreate: jest.fn(),
    onUpdate: jest.fn(),
    onGetAll: jest.fn(),
  };

  mock.getState.mockReturnValue([]);
  mock.getState$.mockReturnValue(of([]));
  mock.initialize.mockResolvedValue(undefined);

  return mock;
};

export const tagsCacheMock = {
  create: createTagsCacheMock,
};
