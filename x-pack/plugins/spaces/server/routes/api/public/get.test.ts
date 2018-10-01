/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../lib/route_pre_check_license', () => {
  return {
    routePreCheckLicense: () => (request: any, h: any) => h.continue,
  };
});

jest.mock('../../../../../../server/lib/get_client_shield', () => {
  return {
    getClient: () => {
      return {
        callWithInternalUser: jest.fn(() => {
          return;
        }),
      };
    },
  };
});
import Boom from 'boom';
import { Space } from '../../../../common/model/space';
import { createSpaces, createTestHandler, RequestRunner, TeardownFn } from '../__fixtures__';
import { initGetSpacesApi } from './get';

describe('GET spaces', () => {
  let request: RequestRunner;
  let teardowns: TeardownFn[];
  const spaces = createSpaces();

  beforeEach(() => {
    const setup = createTestHandler(initGetSpacesApi);

    request = setup.request;
    teardowns = setup.teardowns;
  });

  afterEach(async () => {
    await Promise.all(teardowns.splice(0).map(fn => fn()));
  });

  test(`'GET spaces' returns all available spaces`, async () => {
    const { response } = await request('GET', '/api/spaces/space');

    const { statusCode, payload } = response;

    expect(statusCode).toEqual(200);
    const resultSpaces: Space[] = JSON.parse(payload);
    expect(resultSpaces.map(s => s.id)).toEqual(spaces.map(s => s.id));
  });

  test(`returns result of routePreCheckLicense`, async () => {
    const { response } = await request('GET', '/api/spaces/space', {
      preCheckLicenseImpl: () => Boom.forbidden('test forbidden message'),
      expectSpacesClientCall: false,
    });

    const { statusCode, payload } = response;

    expect(statusCode).toEqual(403);
    expect(JSON.parse(payload)).toMatchObject({
      message: 'test forbidden message',
    });
  });

  test(`'GET spaces/{id}' returns the space with that id`, async () => {
    const { response } = await request('GET', '/api/spaces/space/default');

    const { statusCode, payload } = response;

    expect(statusCode).toEqual(200);
    const resultSpace = JSON.parse(payload);
    expect(resultSpace.id).toEqual('default');
  });

  test(`'GET spaces/{id}' returns 404 when retrieving a non-existent space`, async () => {
    const { response } = await request('GET', '/api/spaces/space/not-a-space');

    const { statusCode } = response;

    expect(statusCode).toEqual(404);
  });
});
