/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { secretService } from './';
import { Keystore, PluginSpec } from './mocks';

describe('The SecretService', function TestSecretService() {
  const mockKbn = {
    Plugin: PluginSpec,
  };
  const subject = secretService(mockKbn);

  beforeAll(() => {
    expect(subject).not.toBeNull();
    mockKbn.Plugin = jest.fn();
  });

  it('should expose itself to other plugins', function Exposure() {
    expect(subject).not.toBeNull();
  });

  it('should expose a method to encrypt data', () => {
    const stubConfigGet = jest.fn();
    const core = {
      expose: jest.fn(),
      log: jest.fn(),
      savedObjects: {
        addScopedSavedObjectsClientWrapperFactory: jest.fn(),
        getSavedObjectsRepository: jest.fn(),
      },
      config: () => {
        return {
          get: stubConfigGet,
        };
      },
      Keystore,
      plugins: {
        elasticsearch: {
          getCluster: () => {
            return { callWithInternalUser: jest.fn() };
          },
        },
      },
    };
    stubConfigGet.mockReturnValue('test-kibana-keystore');
    subject.init(core);
    expect(core.expose).toHaveBeenCalledWith('secretService', expect.any(Object));
  });
});
