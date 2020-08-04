/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyClusterClient } from '../../../../../src/core/server';
import { ConfigSchema, createConfig } from '../config';
import { getSessionIndexTemplate, SessionIndex } from './session_index';

import { loggingSystemMock, elasticsearchServiceMock } from '../../../../../src/core/server/mocks';
import { sessionIndexMock } from './session_index.mock';

describe('Session index', () => {
  let mockClusterClient: jest.Mocked<ILegacyClusterClient>;
  let sessionIndex: SessionIndex;
  const indexName = '.kibana_some_tenant_security_session_1';
  const indexTemplateName = '.kibana_some_tenant_security_session_index_template_1';
  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createLegacyClusterClient();
    const sessionIndexOptions = {
      logger: loggingSystemMock.createLogger(),
      kibanaIndexName: '.kibana_some_tenant',
      config: createConfig(ConfigSchema.validate({}), loggingSystemMock.createLogger(), {
        isTLSEnabled: false,
      }),
      clusterClient: mockClusterClient,
    };

    sessionIndex = new SessionIndex(sessionIndexOptions);
  });

  describe('#initialize', () => {
    function assertExistenceChecksPerformed() {
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('indices.existsTemplate', {
        name: indexTemplateName,
      });
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('indices.exists', {
        index: getSessionIndexTemplate(indexName).index_patterns,
      });
    }

    it('debounces initialize calls', async () => {
      mockClusterClient.callAsInternalUser.mockImplementation(async (method) => {
        if (method === 'indices.existsTemplate' || method === 'indices.exists') {
          return true;
        }

        throw new Error('Unexpected call');
      });

      await Promise.all([
        sessionIndex.initialize(),
        sessionIndex.initialize(),
        sessionIndex.initialize(),
        sessionIndex.initialize(),
      ]);

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(2);
      assertExistenceChecksPerformed();
    });

    it('creates neither index template nor index if they exist', async () => {
      mockClusterClient.callAsInternalUser.mockImplementation(async (method) => {
        if (method === 'indices.existsTemplate' || method === 'indices.exists') {
          return true;
        }

        throw new Error('Unexpected call');
      });

      await sessionIndex.initialize();

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(2);
      assertExistenceChecksPerformed();
    });

    it('creates both index template and index if they do not exist', async () => {
      mockClusterClient.callAsInternalUser.mockImplementation(async (method) => {
        if (method === 'indices.existsTemplate' || method === 'indices.exists') {
          return false;
        }
      });

      await sessionIndex.initialize();

      const expectedIndexTemplate = getSessionIndexTemplate(indexName);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(4);
      assertExistenceChecksPerformed();
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('indices.putTemplate', {
        name: indexTemplateName,
        body: expectedIndexTemplate,
      });
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('indices.create', {
        index: expectedIndexTemplate.index_patterns,
      });
    });

    it('creates only index template if it does not exist even if index exists', async () => {
      mockClusterClient.callAsInternalUser.mockImplementation(async (method) => {
        if (method === 'indices.existsTemplate') {
          return false;
        }

        if (method === 'indices.exists') {
          return true;
        }
      });

      await sessionIndex.initialize();

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(3);
      assertExistenceChecksPerformed();
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('indices.putTemplate', {
        name: indexTemplateName,
        body: getSessionIndexTemplate(indexName),
      });
    });

    it('creates only index if it does not exist even if index template exists', async () => {
      mockClusterClient.callAsInternalUser.mockImplementation(async (method) => {
        if (method === 'indices.existsTemplate') {
          return true;
        }

        if (method === 'indices.exists') {
          return false;
        }
      });

      await sessionIndex.initialize();

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(3);
      assertExistenceChecksPerformed();
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('indices.create', {
        index: getSessionIndexTemplate(indexName).index_patterns,
      });
    });

    it('does not fail if tries to create index when it exists already', async () => {
      mockClusterClient.callAsInternalUser.mockImplementation(async (method) => {
        if (method === 'indices.existsTemplate') {
          return true;
        }

        if (method === 'indices.exists') {
          return false;
        }

        if (method === 'indices.create') {
          // eslint-disable-next-line no-throw-literal
          throw { body: { error: { type: 'resource_already_exists_exception' } } };
        }
      });

      await sessionIndex.initialize();
    });
  });

  describe('cleanUp', () => {
    const now = 123456;
    beforeEach(() => {
      mockClusterClient.callAsInternalUser.mockResolvedValue({});
      jest.spyOn(Date, 'now').mockImplementation(() => now);
    });

    it('throws if call to Elasticsearch fails', async () => {
      const failureReason = new Error('Uh oh.');
      mockClusterClient.callAsInternalUser.mockRejectedValue(failureReason);

      await expect(sessionIndex.cleanUp()).rejects.toBe(failureReason);
    });

    it('when neither `lifespan` nor `idleTimeout` is configured', async () => {
      await sessionIndex.cleanUp();

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('deleteByQuery', {
        index: indexName,
        refresh: 'wait_for',
        ignore: [409, 404],
        body: {
          query: {
            bool: {
              should: [
                { range: { lifespanExpiration: { lte: now } } },
                { range: { idleTimeoutExpiration: { lte: now } } },
              ],
            },
          },
        },
      });
    });

    it('when only `lifespan` is configured', async () => {
      sessionIndex = new SessionIndex({
        logger: loggingSystemMock.createLogger(),
        kibanaIndexName: '.kibana_some_tenant',
        config: createConfig(
          ConfigSchema.validate({ session: { lifespan: 456 } }),
          loggingSystemMock.createLogger(),
          { isTLSEnabled: false }
        ),
        clusterClient: mockClusterClient,
      });

      await sessionIndex.cleanUp();

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('deleteByQuery', {
        index: indexName,
        refresh: 'wait_for',
        ignore: [409, 404],
        body: {
          query: {
            bool: {
              should: [
                { range: { lifespanExpiration: { lte: now } } },
                { bool: { must_not: { exists: { field: 'lifespanExpiration' } } } },
                { range: { idleTimeoutExpiration: { lte: now } } },
              ],
            },
          },
        },
      });
    });

    it('when only `idleTimeout` is configured', async () => {
      const idleTimeout = 123;
      sessionIndex = new SessionIndex({
        logger: loggingSystemMock.createLogger(),
        kibanaIndexName: '.kibana_some_tenant',
        config: createConfig(
          ConfigSchema.validate({ session: { idleTimeout } }),
          loggingSystemMock.createLogger(),
          { isTLSEnabled: false }
        ),
        clusterClient: mockClusterClient,
      });

      await sessionIndex.cleanUp();

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('deleteByQuery', {
        index: indexName,
        refresh: 'wait_for',
        ignore: [409, 404],
        body: {
          query: {
            bool: {
              should: [
                { range: { lifespanExpiration: { lte: now } } },
                { range: { idleTimeoutExpiration: { lte: now - 3 * idleTimeout } } },
                { bool: { must_not: { exists: { field: 'idleTimeoutExpiration' } } } },
              ],
            },
          },
        },
      });
    });

    it('when both `lifespan` and `idleTimeout` are configured', async () => {
      const idleTimeout = 123;
      sessionIndex = new SessionIndex({
        logger: loggingSystemMock.createLogger(),
        kibanaIndexName: '.kibana_some_tenant',
        config: createConfig(
          ConfigSchema.validate({ session: { idleTimeout, lifespan: 456 } }),
          loggingSystemMock.createLogger(),
          { isTLSEnabled: false }
        ),
        clusterClient: mockClusterClient,
      });

      await sessionIndex.cleanUp();

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('deleteByQuery', {
        index: indexName,
        refresh: 'wait_for',
        ignore: [409, 404],
        body: {
          query: {
            bool: {
              should: [
                { range: { lifespanExpiration: { lte: now } } },
                { bool: { must_not: { exists: { field: 'lifespanExpiration' } } } },
                { range: { idleTimeoutExpiration: { lte: now - 3 * idleTimeout } } },
                { bool: { must_not: { exists: { field: 'idleTimeoutExpiration' } } } },
              ],
            },
          },
        },
      });
    });
  });

  describe('#get', () => {
    it('throws if call to Elasticsearch fails', async () => {
      const failureReason = new Error('Uh oh.');
      mockClusterClient.callAsInternalUser.mockRejectedValue(failureReason);

      await expect(sessionIndex.get('some-sid')).rejects.toBe(failureReason);
    });

    it('returns `null` if index is not found', async () => {
      mockClusterClient.callAsInternalUser.mockResolvedValue({ status: 404 });

      await expect(sessionIndex.get('some-sid')).resolves.toBeNull();
    });

    it('returns `null` if session index value document is not found', async () => {
      mockClusterClient.callAsInternalUser.mockResolvedValue({
        found: false,
        status: 200,
      });

      await expect(sessionIndex.get('some-sid')).resolves.toBeNull();
    });

    it('properly returns session index value', async () => {
      const indexDocumentSource = {
        usernameHash: 'some-username-hash',
        provider: { type: 'basic', name: 'basic1' },
        idleTimeoutExpiration: 123,
        lifespanExpiration: null,
        content: 'some-encrypted-content',
      };

      mockClusterClient.callAsInternalUser.mockResolvedValue({
        found: true,
        status: 200,
        _source: indexDocumentSource,
        _primary_term: 1,
        _seq_no: 456,
      });

      await expect(sessionIndex.get('some-sid')).resolves.toEqual({
        ...indexDocumentSource,
        sid: 'some-sid',
        metadata: { primaryTerm: 1, sequenceNumber: 456 },
      });

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('get', {
        id: 'some-sid',
        ignore: [404],
        index: indexName,
      });
    });
  });

  describe('#create', () => {
    it('throws if call to Elasticsearch fails', async () => {
      const failureReason = new Error('Uh oh.');
      mockClusterClient.callAsInternalUser.mockRejectedValue(failureReason);

      await expect(
        sessionIndex.create({
          sid: 'some-long-sid',
          usernameHash: 'some-username-hash',
          provider: { type: 'basic', name: 'basic1' },
          idleTimeoutExpiration: null,
          lifespanExpiration: null,
          content: 'some-encrypted-content',
        })
      ).rejects.toBe(failureReason);
    });

    it('properly stores session value in the index', async () => {
      mockClusterClient.callAsInternalUser.mockResolvedValue({
        _primary_term: 321,
        _seq_no: 654,
      });

      const sid = 'some-long-sid';
      const sessionValue = {
        usernameHash: 'some-username-hash',
        provider: { type: 'basic', name: 'basic1' },
        idleTimeoutExpiration: null,
        lifespanExpiration: null,
        content: 'some-encrypted-content',
      };

      await expect(sessionIndex.create({ sid, ...sessionValue })).resolves.toEqual({
        ...sessionValue,
        sid,
        metadata: { primaryTerm: 321, sequenceNumber: 654 },
      });

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('create', {
        id: sid,
        index: indexName,
        body: sessionValue,
        refresh: 'wait_for',
      });
    });
  });

  describe('#update', () => {
    it('throws if call to Elasticsearch fails', async () => {
      const failureReason = new Error('Uh oh.');
      mockClusterClient.callAsInternalUser.mockRejectedValue(failureReason);

      await expect(sessionIndex.update(sessionIndexMock.createValue())).rejects.toBe(failureReason);
    });

    it('refetches latest session value if update fails due to conflict', async () => {
      const latestSessionValue = {
        usernameHash: 'some-username-hash',
        provider: { type: 'basic', name: 'basic1' },
        idleTimeoutExpiration: 100,
        lifespanExpiration: 200,
        content: 'some-updated-encrypted-content',
      };

      mockClusterClient.callAsInternalUser.mockImplementation(async (method) => {
        if (method === 'get') {
          return {
            found: true,
            status: 200,
            _source: latestSessionValue,
            _primary_term: 321,
            _seq_no: 654,
          };
        }

        if (method === 'index') {
          return { status: 409 };
        }
      });

      const sid = 'some-long-sid';
      const metadata = { primaryTerm: 123, sequenceNumber: 456 };
      const sessionValue = {
        usernameHash: 'some-username-hash',
        provider: { type: 'basic', name: 'basic1' },
        idleTimeoutExpiration: null,
        lifespanExpiration: null,
        content: 'some-encrypted-content',
      };

      await expect(sessionIndex.update({ sid, metadata, ...sessionValue })).resolves.toEqual({
        ...latestSessionValue,
        sid,
        metadata: { primaryTerm: 321, sequenceNumber: 654 },
      });

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(2);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('index', {
        id: sid,
        index: indexName,
        body: sessionValue,
        ifSeqNo: 456,
        ifPrimaryTerm: 123,
        refresh: 'wait_for',
        ignore: [409],
      });
    });

    it('properly stores session value in the index', async () => {
      mockClusterClient.callAsInternalUser.mockResolvedValue({
        _primary_term: 321,
        _seq_no: 654,
        status: 200,
      });

      const sid = 'some-long-sid';
      const metadata = { primaryTerm: 123, sequenceNumber: 456 };
      const sessionValue = {
        usernameHash: 'some-username-hash',
        provider: { type: 'basic', name: 'basic1' },
        idleTimeoutExpiration: null,
        lifespanExpiration: null,
        content: 'some-encrypted-content',
      };

      await expect(sessionIndex.update({ sid, metadata, ...sessionValue })).resolves.toEqual({
        ...sessionValue,
        sid,
        metadata: { primaryTerm: 321, sequenceNumber: 654 },
      });

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('index', {
        id: sid,
        index: indexName,
        body: sessionValue,
        ifSeqNo: 456,
        ifPrimaryTerm: 123,
        refresh: 'wait_for',
        ignore: [409],
      });
    });
  });

  describe('#clear', () => {
    it('throws if call to Elasticsearch fails', async () => {
      const failureReason = new Error('Uh oh.');
      mockClusterClient.callAsInternalUser.mockRejectedValue(failureReason);

      await expect(sessionIndex.clear('some-long-sid')).rejects.toBe(failureReason);
    });

    it('properly removes session value from the index', async () => {
      await sessionIndex.clear('some-long-sid');

      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockClusterClient.callAsInternalUser).toHaveBeenCalledWith('delete', {
        id: 'some-long-sid',
        index: indexName,
        refresh: 'wait_for',
        ignore: [404],
      });
    });
  });
});
