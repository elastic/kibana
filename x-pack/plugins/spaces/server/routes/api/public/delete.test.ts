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
import { createTestHandler, RequestRunner, TeardownFn } from '../__fixtures__';
import { initDeleteSpacesApi } from './delete';

describe('Spaces Public API', () => {
  let request: RequestRunner;
  let teardowns: TeardownFn[];

  beforeEach(() => {
    const setup = createTestHandler(initDeleteSpacesApi);

    request = setup.request;
    teardowns = setup.teardowns;
  });

  afterEach(async () => {
    await Promise.all(teardowns.splice(0).map(fn => fn()));
  });

  test(`'DELETE spaces/{id}' deletes the space`, async () => {
    const { response } = await request('DELETE', '/api/spaces/space/a-space');

    const { statusCode } = response;

    expect(statusCode).toEqual(204);
  });

  test(`returns result of routePreCheckLicense`, async () => {
    const { response } = await request('DELETE', '/api/spaces/space/a-space', {
      preCheckLicenseImpl: () => Boom.forbidden('test forbidden message'),
      expectSpacesClientCall: false,
    });

    const { statusCode, payload } = response;

    expect(statusCode).toEqual(403);
    expect(JSON.parse(payload)).toMatchObject({
      message: 'test forbidden message',
    });
  });

  test('DELETE spaces/{id} throws when deleting a non-existent space', async () => {
    const { response } = await request('DELETE', '/api/spaces/space/not-a-space');

    const { statusCode } = response;

    expect(statusCode).toEqual(404);
  });

  test(`'DELETE spaces/{id}' cannot delete reserved spaces`, async () => {
    const { response } = await request('DELETE', '/api/spaces/space/default');

    const { statusCode, payload } = response;

    expect(statusCode).toEqual(400);
    expect(JSON.parse(payload)).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: 'This Space cannot be deleted because it is reserved.',
    });
  });
});
