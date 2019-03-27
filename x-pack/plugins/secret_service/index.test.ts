/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { secretService } from './';
import { PluginSpec } from './mocks';

describe('The SecretService', function TestSecretService() {
  const mockKbn = {
    Plugin: PluginSpec,
  };
  const subject = secretService(mockKbn);
  beforeAll(() => {
    expect(subject).not.toBeNull();
    mockKbn.Plugin = jest.fn();
  });

  it('should expose itself to other plugins', () => {
    expect(subject).not.toBeNull();
  });

  it('should expose a method to encrypt data', async () => {
    const stubConfigGet = jest.fn();
    const stubKeystore = {
      has: jest.fn(),
      get: jest.fn(),
      add: jest.fn(),
      exists: jest.fn(),
      save: jest.fn(),
    };
    let secret: string;
    const core = {
      expose: jest.fn(),
      log: jest.fn(),
      logWithMetadata: jest.fn(),
      savedObjects: {
        addScopedSavedObjectsClientWrapperFactory: jest.fn(),
        getSavedObjectsRepository: jest.fn(() => {
          return {
            errors: {
              isConflictError: jest.fn(),
            },
            create: jest.fn((type, attributes, { id }) => {
              secret = attributes.secret;
              return {
                id,
                type,
                attributes,
              };
            }),
            get: jest.fn((type, id) => {
              return {
                id,
                type,
                attributes: {
                  secret,
                },
              };
            }),
          };
        }),
      },
      config: () => {
        return {
          get: stubConfigGet,
        };
      },
      keystore: stubKeystore,
      plugins: {
        elasticsearch: {
          getCluster: () => {
            return { callWithInternalUser: jest.fn() };
          },
        },
      },
    };

    stubKeystore.get.mockReturnValue('bogusencrpyptionley');
    stubConfigGet.mockReturnValueOnce(false);
    await subject.init(core);
    expect(core.expose).toHaveBeenCalledWith('secretService', expect.any(Object));
  });
});
