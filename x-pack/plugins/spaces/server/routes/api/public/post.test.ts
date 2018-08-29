/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../lib/route_pre_check_license', () => {
  return {
    routePreCheckLicense: () => (request: any, reply: any) => reply.continue(),
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

import { createTestHandler, RequestRunner, TeardownFn } from '../__fixtures__';
import { initPostSpacesApi } from './';

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

    const { mockSavedObjectsClient, response } = await request('POST', '/api/spaces', { payload });

    const { statusCode } = response;

    expect(statusCode).toEqual(200);
    expect(mockSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
      'space',
      { name: 'my new space', description: 'with a description' },
      { id: 'my-space-id', overwrite: false }
    );
  });

  test('POST /space should not allow a space to be updated', async () => {
    const payload = {
      id: 'a-space',
      name: 'my updated space',
      description: 'with a description',
    };

    const { response } = await request('POST', '/api/spaces', { payload });

    const { statusCode, payload: responsePayload } = response;

    expect(statusCode).toEqual(409);
    expect(JSON.parse(responsePayload)).toEqual({
      error: 'Conflict',
      message:
        'A space with the identifier a-space already exists. Please choose a different identifier',
      statusCode: 409,
    });
  });
});
