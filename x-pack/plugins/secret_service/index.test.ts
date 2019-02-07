/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { secretService } from './';
import { Keystore, PluginSpec } from './mocks';

describe('The SecretService', function TestSecretService() {
  const kbn = {
    Plugin: PluginSpec,
  };
  const mockKbn = sinon.mock(kbn);
  const subject = secretService(kbn);
  beforeAll(() => {
    expect(subject).not.toBeNull();
    mockKbn.expects('Plugin').once();
  });
  afterAll(() => {
    mockKbn.verify();
  });

  it('should expose itself to other plugins', function Exposure() {
    expect(subject).not.toBeNull();
  });

  it('should expose a method to encrypt data', () => {
    const core = {
      expose: sinon.spy(),
      log: sinon.spy(),
      savedObjects: {
        addScopedSavedObjectsClientWrapperFactory: sinon.spy(),
        getSavedObjectsRepository: sinon.spy(),
      },
      config: () => {
        return {
          get: sinon.spy(),
        };
      },
      Keystore,
      plugins: {
        elasticsearch: {
          getCluster: () => {
            return { callWithInternalUser: sinon.spy() };
          },
        },
      },
    };
    subject.init(core);
    core.expose.calledWith('secretservice', sinon.match.func);
  });
});
