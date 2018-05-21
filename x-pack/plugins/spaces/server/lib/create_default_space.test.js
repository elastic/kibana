/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import { getClient } from '../../../../server/lib/get_client_shield';
import { createDefaultSpace } from './create_default_space';

jest.mock('../../../../server/lib/get_client_shield', () => ({
  getClient: jest.fn()
}));

let mockCallWithRequest;
beforeEach(() => {
  mockCallWithRequest = jest.fn();
  getClient.mockReturnValue({
    callWithRequest: mockCallWithRequest
  });
});

const createMockServer = (settings = {}) => {

  const {
    defaultExists = false
  } = settings;

  const mockServer = {
    config: jest.fn().mockReturnValue({
      get: jest.fn()
    }),
    savedObjectsClientFactory: jest.fn().mockReturnValue({
      get: jest.fn().mockImplementation(() => {
        if (defaultExists) {
          return;
        }
        throw Boom.notFound('unit test: default space not found');
      }),
      create: jest.fn().mockReturnValue(),
      errors: {
        isNotFoundError: (e) => e.message === 'unit test: default space not found'
      }
    })
  };

  mockServer.config().get.mockImplementation(key => {
    return settings[key];
  });

  return mockServer;
};

test(`it creates the default space when one does not exist`, async () => {
  const server = createMockServer({
    defaultExists: false
  });

  await createDefaultSpace(server);

  const client = server.savedObjectsClientFactory();

  expect(client.get).toHaveBeenCalledTimes(1);
  expect(client.create).toHaveBeenCalledTimes(1);
  expect(client.create).toHaveBeenCalledWith(
    'space',
    { "_reserved": true, "description": "This is your Default Space!", "name": "Default Space", "urlContext": "" },
    { "id": "default" }
  );
});

test(`it does not attempt to recreate the default space if it already exists`, async () => {
  const server = createMockServer({
    defaultExists: true
  });

  await createDefaultSpace(server);

  const client = server.savedObjectsClientFactory();

  expect(client.get).toHaveBeenCalledTimes(1);
  expect(client.create).toHaveBeenCalledTimes(0);
});

test(`it throws all other errors from the saved objects client`, async () => {
  const server = createMockServer({
    defaultExists: true,
  });

  const client = server.savedObjectsClientFactory();
  client.get = () => { throw new Error('unit test: unexpected exception condition'); };

  try {
    await createDefaultSpace(server);
    throw new Error(`Expected error to be thrown!`);
  } catch (e) {
    expect(e.message).toEqual('unit test: unexpected exception condition');
  }
});
