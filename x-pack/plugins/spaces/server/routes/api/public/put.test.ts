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
import { initPutSpacesApi } from './';

describe('Spaces Public API', () => {
  let request: RequestRunner;
  let teardowns: TeardownFn[];

  beforeEach(() => {
    const setup = createTestHandler(initPutSpacesApi);

    request = setup.request;
    teardowns = setup.teardowns;
  });

  afterEach(async () => {
    await Promise.all(teardowns.splice(0).map(fn => fn()));
  });

  test('PUT /space should update an existing space with the provided ID', async () => {
    const payload = {
      id: 'a-space',
      name: 'my updated space',
      description: 'with a description',
    };

    const { mockSavedObjectsClient, response } = await request('PUT', '/api/spaces/a-space', {
      payload,
    });

    const { statusCode } = response;

    expect(statusCode).toEqual(200);
    expect(mockSavedObjectsClient.update).toHaveBeenCalledTimes(1);
    expect(mockSavedObjectsClient.update).toHaveBeenCalledWith('space', 'a-space', {
      name: 'my updated space',
      description: 'with a description',
    });
  });

  test('PUT /space should not allow a new space to be created', async () => {
    const payload = {
      id: 'a-new-space',
      name: 'my new space',
      description: 'with a description',
    };

    const { response } = await request('PUT', '/api/spaces/a-new-space', { payload });

    const { statusCode } = response;

    expect(statusCode).toEqual(404);
  });
});
