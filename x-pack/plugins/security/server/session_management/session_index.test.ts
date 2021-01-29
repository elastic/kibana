/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { errors } from '@elastic/elasticsearch';
import { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import { ElasticsearchClient } from '../../../../../src/core/server';
import { ConfigSchema, createConfig } from '../config';
import { getSessionIndexTemplate, SessionIndex } from './session_index';

import { loggingSystemMock, elasticsearchServiceMock } from '../../../../../src/core/server/mocks';
import { securityMock } from '../mocks';
import { sessionIndexMock } from './session_index.mock';

describe('Session index', () => {
  let mockElasticsearchClient: DeeplyMockedKeys<ElasticsearchClient>;
  let sessionIndex: SessionIndex;
  const indexName = '.kibana_some_tenant_security_session_1';
  const indexTemplateName = '.kibana_some_tenant_security_session_index_template_1';
  beforeEach(() => {
    mockElasticsearchClient = elasticsearchServiceMock.createElasticsearchClient();
    const sessionIndexOptions = {
      logger: loggingSystemMock.createLogger(),
      kibanaIndexName: '.kibana_some_tenant',
      config: createConfig(ConfigSchema.validate({}), loggingSystemMock.createLogger(), {
        isTLSEnabled: false,
      }),
      elasticsearchClient: mockElasticsearchClient,
    };

    sessionIndex = new SessionIndex(sessionIndexOptions);
  });

  describe('#initialize', () => {
    function assertExistenceChecksPerformed() {
      expect(mockElasticsearchClient.indices.existsTemplate).toHaveBeenCalledWith({
        name: indexTemplateName,
      });
      expect(mockElasticsearchClient.indices.exists).toHaveBeenCalledWith({
        index: getSessionIndexTemplate(indexName).index_patterns,
      });
    }

    it('debounces initialize calls', async () => {
      mockElasticsearchClient.indices.existsTemplate.mockResolvedValue(
        securityMock.createApiResponse({ body: true })
      );
      mockElasticsearchClient.indices.exists.mockResolvedValue(
        securityMock.createApiResponse({ body: true })
      );

      await Promise.all([
        sessionIndex.initialize(),
        sessionIndex.initialize(),
        sessionIndex.initialize(),
        sessionIndex.initialize(),
      ]);

      assertExistenceChecksPerformed();
    });

    it('creates neither index template nor index if they exist', async () => {
      mockElasticsearchClient.indices.existsTemplate.mockResolvedValue(
        securityMock.createApiResponse({ body: true })
      );
      mockElasticsearchClient.indices.exists.mockResolvedValue(
        securityMock.createApiResponse({ body: true })
      );

      await sessionIndex.initialize();

      assertExistenceChecksPerformed();
    });

    it('creates both index template and index if they do not exist', async () => {
      mockElasticsearchClient.indices.existsTemplate.mockResolvedValue(
        securityMock.createApiResponse({ body: false })
      );
      mockElasticsearchClient.indices.exists.mockResolvedValue(
        securityMock.createApiResponse({ body: false })
      );

      await sessionIndex.initialize();

      const expectedIndexTemplate = getSessionIndexTemplate(indexName);
      assertExistenceChecksPerformed();
      expect(mockElasticsearchClient.indices.putTemplate).toHaveBeenCalledWith({
        name: indexTemplateName,
        body: expectedIndexTemplate,
      });
      expect(mockElasticsearchClient.indices.create).toHaveBeenCalledWith({
        index: expectedIndexTemplate.index_patterns,
      });
    });

    it('creates only index template if it does not exist even if index exists', async () => {
      mockElasticsearchClient.indices.existsTemplate.mockResolvedValue(
        securityMock.createApiResponse({ body: false })
      );
      mockElasticsearchClient.indices.exists.mockResolvedValue(
        securityMock.createApiResponse({ body: true })
      );

      await sessionIndex.initialize();

      assertExistenceChecksPerformed();
      expect(mockElasticsearchClient.indices.putTemplate).toHaveBeenCalledWith({
        name: indexTemplateName,
        body: getSessionIndexTemplate(indexName),
      });
    });

    it('creates only index if it does not exist even if index template exists', async () => {
      mockElasticsearchClient.indices.existsTemplate.mockResolvedValue(
        securityMock.createApiResponse({ body: true })
      );
      mockElasticsearchClient.indices.exists.mockResolvedValue(
        securityMock.createApiResponse({ body: false })
      );

      await sessionIndex.initialize();

      assertExistenceChecksPerformed();
      expect(mockElasticsearchClient.indices.create).toHaveBeenCalledWith({
        index: getSessionIndexTemplate(indexName).index_patterns,
      });
    });

    it('does not fail if tries to create index when it exists already', async () => {
      mockElasticsearchClient.indices.existsTemplate.mockResolvedValue(
        securityMock.createApiResponse({ body: true })
      );
      mockElasticsearchClient.indices.exists.mockResolvedValue(
        securityMock.createApiResponse({ body: false })
      );
      mockElasticsearchClient.indices.create.mockRejectedValue(
        new errors.ResponseError(
          securityMock.createApiResponse({
            body: { error: { type: 'resource_already_exists_exception' } },
          })
        )
      );

      await sessionIndex.initialize();
    });

    it('works properly after failure', async () => {
      const unexpectedError = new errors.ResponseError(
        securityMock.createApiResponse(securityMock.createApiResponse({ body: { type: 'Uh oh.' } }))
      );
      mockElasticsearchClient.indices.existsTemplate.mockRejectedValueOnce(unexpectedError);
      mockElasticsearchClient.indices.existsTemplate.mockResolvedValueOnce(
        securityMock.createApiResponse({ body: true })
      );

      await expect(sessionIndex.initialize()).rejects.toBe(unexpectedError);
      await expect(sessionIndex.initialize()).resolves.toBe(undefined);
    });
  });

  describe('cleanUp', () => {
    const now = 123456;
    beforeEach(() => {
      mockElasticsearchClient.deleteByQuery.mockResolvedValue(
        securityMock.createApiResponse({ body: {} })
      );
      jest.spyOn(Date, 'now').mockImplementation(() => now);
    });

    it('throws if call to Elasticsearch fails', async () => {
      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse(securityMock.createApiResponse({ body: { type: 'Uh oh.' } }))
      );
      mockElasticsearchClient.deleteByQuery.mockRejectedValue(failureReason);

      await expect(sessionIndex.cleanUp()).rejects.toBe(failureReason);
    });

    it('when neither `lifespan` nor `idleTimeout` is configured', async () => {
      await sessionIndex.cleanUp();

      expect(mockElasticsearchClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.deleteByQuery).toHaveBeenCalledWith(
        {
          index: indexName,
          refresh: true,
          body: {
            query: {
              bool: {
                should: [
                  // All expired sessions based on the lifespan, no matter which provider they belong to.
                  { range: { lifespanExpiration: { lte: now } } },
                  // All sessions that belong to the providers that aren't configured.
                  {
                    bool: {
                      must_not: {
                        bool: {
                          should: [
                            {
                              bool: {
                                must: [
                                  { term: { 'provider.type': 'basic' } },
                                  { term: { 'provider.name': 'basic' } },
                                ],
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    },
                  },
                  // The sessions that belong to a particular provider that are expired based on the idle timeout.
                  {
                    bool: {
                      must: [
                        { term: { 'provider.type': 'basic' } },
                        { term: { 'provider.name': 'basic' } },
                      ],
                      should: [{ range: { idleTimeoutExpiration: { lte: now } } }],
                      minimum_should_match: 1,
                    },
                  },
                ],
              },
            },
          },
        },
        { ignore: [409, 404] }
      );
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
        elasticsearchClient: mockElasticsearchClient,
      });

      await sessionIndex.cleanUp();

      expect(mockElasticsearchClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.deleteByQuery).toHaveBeenCalledWith(
        {
          index: indexName,
          refresh: true,
          body: {
            query: {
              bool: {
                should: [
                  // All expired sessions based on the lifespan, no matter which provider they belong to.
                  { range: { lifespanExpiration: { lte: now } } },
                  // All sessions that belong to the providers that aren't configured.
                  {
                    bool: {
                      must_not: {
                        bool: {
                          should: [
                            {
                              bool: {
                                must: [
                                  { term: { 'provider.type': 'basic' } },
                                  { term: { 'provider.name': 'basic' } },
                                ],
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    },
                  },
                  // The sessions that belong to a particular provider but don't have a configured lifespan.
                  {
                    bool: {
                      must: [
                        { term: { 'provider.type': 'basic' } },
                        { term: { 'provider.name': 'basic' } },
                      ],
                      must_not: { exists: { field: 'lifespanExpiration' } },
                    },
                  },
                  // The sessions that belong to a particular provider that are expired based on the idle timeout.
                  {
                    bool: {
                      must: [
                        { term: { 'provider.type': 'basic' } },
                        { term: { 'provider.name': 'basic' } },
                      ],
                      should: [{ range: { idleTimeoutExpiration: { lte: now } } }],
                      minimum_should_match: 1,
                    },
                  },
                ],
              },
            },
          },
        },
        { ignore: [409, 404] }
      );
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
        elasticsearchClient: mockElasticsearchClient,
      });

      await sessionIndex.cleanUp();

      expect(mockElasticsearchClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.deleteByQuery).toHaveBeenCalledWith(
        {
          index: indexName,
          refresh: true,
          body: {
            query: {
              bool: {
                should: [
                  // All expired sessions based on the lifespan, no matter which provider they belong to.
                  { range: { lifespanExpiration: { lte: now } } },
                  // All sessions that belong to the providers that aren't configured.
                  {
                    bool: {
                      must_not: {
                        bool: {
                          should: [
                            {
                              bool: {
                                must: [
                                  { term: { 'provider.type': 'basic' } },
                                  { term: { 'provider.name': 'basic' } },
                                ],
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    },
                  },
                  // The sessions that belong to a particular provider that are either expired based on the idle timeout
                  // or don't have it configured at all.
                  {
                    bool: {
                      must: [
                        { term: { 'provider.type': 'basic' } },
                        { term: { 'provider.name': 'basic' } },
                      ],
                      should: [
                        { range: { idleTimeoutExpiration: { lte: now - 3 * idleTimeout } } },
                        { bool: { must_not: { exists: { field: 'idleTimeoutExpiration' } } } },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
              },
            },
          },
        },
        { ignore: [409, 404] }
      );
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
        elasticsearchClient: mockElasticsearchClient,
      });

      await sessionIndex.cleanUp();

      expect(mockElasticsearchClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.deleteByQuery).toHaveBeenCalledWith(
        {
          index: indexName,
          refresh: true,
          body: {
            query: {
              bool: {
                should: [
                  // All expired sessions based on the lifespan, no matter which provider they belong to.
                  { range: { lifespanExpiration: { lte: now } } },
                  // All sessions that belong to the providers that aren't configured.
                  {
                    bool: {
                      must_not: {
                        bool: {
                          should: [
                            {
                              bool: {
                                must: [
                                  { term: { 'provider.type': 'basic' } },
                                  { term: { 'provider.name': 'basic' } },
                                ],
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    },
                  },
                  // The sessions that belong to a particular provider but don't have a configured lifespan.
                  {
                    bool: {
                      must: [
                        { term: { 'provider.type': 'basic' } },
                        { term: { 'provider.name': 'basic' } },
                      ],
                      must_not: { exists: { field: 'lifespanExpiration' } },
                    },
                  },
                  // The sessions that belong to a particular provider that are either expired based on the idle timeout
                  // or don't have it configured at all.
                  {
                    bool: {
                      must: [
                        { term: { 'provider.type': 'basic' } },
                        { term: { 'provider.name': 'basic' } },
                      ],
                      should: [
                        { range: { idleTimeoutExpiration: { lte: now - 3 * idleTimeout } } },
                        { bool: { must_not: { exists: { field: 'idleTimeoutExpiration' } } } },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
              },
            },
          },
        },
        { ignore: [409, 404] }
      );
    });

    it('when both `lifespan` and `idleTimeout` are configured and multiple providers are enabled', async () => {
      const globalIdleTimeout = 123;
      const samlIdleTimeout = 33221;
      sessionIndex = new SessionIndex({
        logger: loggingSystemMock.createLogger(),
        kibanaIndexName: '.kibana_some_tenant',
        config: createConfig(
          ConfigSchema.validate({
            session: { idleTimeout: globalIdleTimeout, lifespan: 456 },
            authc: {
              providers: {
                basic: { basic1: { order: 0 } },
                saml: {
                  saml1: {
                    order: 1,
                    realm: 'saml-realm',
                    session: { idleTimeout: samlIdleTimeout },
                  },
                },
              },
            },
          }),
          loggingSystemMock.createLogger(),
          { isTLSEnabled: false }
        ),
        elasticsearchClient: mockElasticsearchClient,
      });

      await sessionIndex.cleanUp();

      expect(mockElasticsearchClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.deleteByQuery).toHaveBeenCalledWith(
        {
          index: indexName,
          refresh: true,
          body: {
            query: {
              bool: {
                should: [
                  // All expired sessions based on the lifespan, no matter which provider they belong to.
                  { range: { lifespanExpiration: { lte: now } } },
                  // All sessions that belong to the providers that aren't configured.
                  {
                    bool: {
                      must_not: {
                        bool: {
                          should: [
                            {
                              bool: {
                                must: [
                                  { term: { 'provider.type': 'basic' } },
                                  { term: { 'provider.name': 'basic1' } },
                                ],
                              },
                            },
                            {
                              bool: {
                                must: [
                                  { term: { 'provider.type': 'saml' } },
                                  { term: { 'provider.name': 'saml1' } },
                                ],
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    },
                  },
                  // The sessions that belong to a Basic provider but don't have a configured lifespan.
                  {
                    bool: {
                      must: [
                        { term: { 'provider.type': 'basic' } },
                        { term: { 'provider.name': 'basic1' } },
                      ],
                      must_not: { exists: { field: 'lifespanExpiration' } },
                    },
                  },
                  // The sessions that belong to a Basic provider that are either expired based on the idle timeout
                  // or don't have it configured at all.
                  {
                    bool: {
                      must: [
                        { term: { 'provider.type': 'basic' } },
                        { term: { 'provider.name': 'basic1' } },
                      ],
                      should: [
                        { range: { idleTimeoutExpiration: { lte: now - 3 * globalIdleTimeout } } },
                        { bool: { must_not: { exists: { field: 'idleTimeoutExpiration' } } } },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                  // The sessions that belong to a SAML provider but don't have a configured lifespan.
                  {
                    bool: {
                      must: [
                        { term: { 'provider.type': 'saml' } },
                        { term: { 'provider.name': 'saml1' } },
                      ],
                      must_not: { exists: { field: 'lifespanExpiration' } },
                    },
                  },
                  // The sessions that belong to a SAML provider that are either expired based on the idle timeout
                  // or don't have it configured at all.
                  {
                    bool: {
                      must: [
                        { term: { 'provider.type': 'saml' } },
                        { term: { 'provider.name': 'saml1' } },
                      ],
                      should: [
                        { range: { idleTimeoutExpiration: { lte: now - 3 * samlIdleTimeout } } },
                        { bool: { must_not: { exists: { field: 'idleTimeoutExpiration' } } } },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
              },
            },
          },
        },
        { ignore: [409, 404] }
      );
    });
  });

  describe('#get', () => {
    it('throws if call to Elasticsearch fails', async () => {
      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse(securityMock.createApiResponse({ body: { type: 'Uh oh.' } }))
      );
      mockElasticsearchClient.get.mockRejectedValue(failureReason);

      await expect(sessionIndex.get('some-sid')).rejects.toBe(failureReason);
    });

    it('returns `null` if index is not found', async () => {
      mockElasticsearchClient.get.mockResolvedValue(
        securityMock.createApiResponse({ statusCode: 404, body: { status: 404 } })
      );

      await expect(sessionIndex.get('some-sid')).resolves.toBeNull();
    });

    it('returns `null` if session index value document is not found', async () => {
      mockElasticsearchClient.get.mockResolvedValue(
        securityMock.createApiResponse({ body: { status: 200, found: false } })
      );

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

      mockElasticsearchClient.get.mockResolvedValue(
        securityMock.createApiResponse({
          body: {
            found: true,
            status: 200,
            _source: indexDocumentSource,
            _primary_term: 1,
            _seq_no: 456,
          },
        })
      );

      await expect(sessionIndex.get('some-sid')).resolves.toEqual({
        ...indexDocumentSource,
        sid: 'some-sid',
        metadata: { primaryTerm: 1, sequenceNumber: 456 },
      });

      expect(mockElasticsearchClient.get).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.get).toHaveBeenCalledWith(
        { id: 'some-sid', index: indexName },
        { ignore: [404] }
      );
    });
  });

  describe('#create', () => {
    it('throws if call to Elasticsearch fails', async () => {
      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse(securityMock.createApiResponse({ body: { type: 'Uh oh.' } }))
      );
      mockElasticsearchClient.create.mockRejectedValue(failureReason);

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
      mockElasticsearchClient.create.mockResolvedValue(
        securityMock.createApiResponse({ body: { _primary_term: 321, _seq_no: 654 } })
      );

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

      expect(mockElasticsearchClient.create).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.create).toHaveBeenCalledWith({
        id: sid,
        index: indexName,
        body: sessionValue,
        refresh: 'wait_for',
      });
    });
  });

  describe('#update', () => {
    it('throws if call to Elasticsearch fails', async () => {
      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse(securityMock.createApiResponse({ body: { type: 'Uh oh.' } }))
      );
      mockElasticsearchClient.index.mockRejectedValue(failureReason);

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

      mockElasticsearchClient.get.mockResolvedValue(
        securityMock.createApiResponse({
          body: {
            found: true,
            status: 200,
            _source: latestSessionValue,
            _primary_term: 321,
            _seq_no: 654,
          },
        })
      );
      mockElasticsearchClient.index.mockResolvedValue(
        securityMock.createApiResponse({ statusCode: 409, body: { status: 409 } })
      );

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

      expect(mockElasticsearchClient.index).toHaveBeenCalledWith(
        {
          id: sid,
          index: indexName,
          body: sessionValue,
          if_seq_no: 456,
          if_primary_term: 123,
          refresh: 'wait_for',
        },
        { ignore: [409] }
      );
    });

    it('properly stores session value in the index', async () => {
      mockElasticsearchClient.index.mockResolvedValue(
        securityMock.createApiResponse({ body: { _primary_term: 321, _seq_no: 654, status: 200 } })
      );

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

      expect(mockElasticsearchClient.index).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.index).toHaveBeenCalledWith(
        {
          id: sid,
          index: indexName,
          body: sessionValue,
          if_seq_no: 456,
          if_primary_term: 123,
          refresh: 'wait_for',
        },
        { ignore: [409] }
      );
    });
  });

  describe('#clear', () => {
    it('throws if call to Elasticsearch fails', async () => {
      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse(securityMock.createApiResponse({ body: { type: 'Uh oh.' } }))
      );
      mockElasticsearchClient.delete.mockRejectedValue(failureReason);

      await expect(sessionIndex.clear('some-long-sid')).rejects.toBe(failureReason);
    });

    it('properly removes session value from the index', async () => {
      await sessionIndex.clear('some-long-sid');

      expect(mockElasticsearchClient.delete).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.delete).toHaveBeenCalledWith(
        { id: 'some-long-sid', index: indexName, refresh: 'wait_for' },
        { ignore: [404] }
      );
    });
  });
});
