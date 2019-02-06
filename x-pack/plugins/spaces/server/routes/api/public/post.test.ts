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
import { initPostSpacesApi } from './post';

describe('Spaces Public API', () => {
  let request: RequestRunner;
  let teardowns: TeardownFn[];

  beforeEach(() => {
    const setup = createTestHandler(initPostSpacesApi);

    request = setup.request;
    teardowns = setup.teardowns;
  });

  afterEach(async () => {
    await Promise.all(teardowns.splice(0).map(fn => fn()));
  });

  test('POST /space should create a new space with the provided ID', async () => {
    const payload = {
      id: 'my-space-id',
      name: 'my new space',
      description: 'with a description',
    };

    const { mockSavedObjectsRepository, response } = await request('POST', '/api/spaces/space', {
      payload,
    });

    const { statusCode } = response;

    expect(statusCode).toEqual(200);
    expect(mockSavedObjectsRepository.create).toHaveBeenCalledTimes(1);
    expect(mockSavedObjectsRepository.create).toHaveBeenCalledWith(
      'space',
      { name: 'my new space', description: 'with a description' },
      { id: 'my-space-id' }
    );
  });

  test(`returns result of routePreCheckLicense`, async () => {
    const payload = {
      id: 'my-space-id',
      name: 'my new space',
      description: 'with a description',
    };

    const { response } = await request('POST', '/api/spaces/space', {
      preCheckLicenseImpl: () => Boom.forbidden('test forbidden message'),
      expectSpacesClientCall: false,
      payload,
    });

    const { statusCode, payload: responsePayload } = response;

    expect(statusCode).toEqual(403);
    expect(JSON.parse(responsePayload)).toMatchObject({
      message: 'test forbidden message',
    });
  });

  test('POST /space should not allow a space to be updated', async () => {
    const payload = {
      id: 'a-space',
      name: 'my updated space',
      description: 'with a description',
    };

    const { response } = await request('POST', '/api/spaces/space', { payload });

    const { statusCode, payload: responsePayload } = response;

    expect(statusCode).toEqual(409);
    expect(JSON.parse(responsePayload)).toEqual({
      error: 'Conflict',
      message: 'A space with the identifier a-space already exists.',
      statusCode: 409,
    });
  });
});
