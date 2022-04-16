/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { KibanaRequest } from '@kbn/core/server';
import { spacesServiceMock } from '@kbn/spaces-plugin/server/spaces_service/spaces_service.mock';

import { getSpaceId } from './get_space_id';

describe('get_space_id', () => {
  let request = KibanaRequest.from(httpServerMock.createRawRequest({}));
  beforeEach(() => {
    request = KibanaRequest.from(httpServerMock.createRawRequest({}));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns "default" as the space id given a space id of "default"', () => {
    const spaces = spacesServiceMock.createStartContract();
    const space = getSpaceId({ request, spaces });
    expect(space).toEqual('default');
  });

  test('it returns "another-space" as the space id given a space id of "another-space"', () => {
    const spaces = spacesServiceMock.createStartContract('another-space');
    const space = getSpaceId({ request, spaces });
    expect(space).toEqual('another-space');
  });

  test('it returns "default" as the space id given a space id of undefined', () => {
    const space = getSpaceId({ request, spaces: undefined });
    expect(space).toEqual('default');
  });

  test('it returns "default" as the space id given a space id of null', () => {
    const space = getSpaceId({ request, spaces: null });
    expect(space).toEqual('default');
  });
});
