/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type {
  BulkResponse,
  ClosePointInTimeResponse,
  OpenPointInTimeResponse,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

import type { AuditLogger } from '../audit';
import { auditLoggerMock } from '../audit/mocks';
import { ConfigSchema, createConfig } from '../config';
import { securityMock } from '../mocks';
import { getSessionIndexTemplate, SessionIndex } from './session_index';
import { sessionIndexMock } from './session_index.mock';

describe('Session index', () => {
  let mockElasticsearchClient: ReturnType<
    typeof elasticsearchServiceMock.createElasticsearchClient
  >;
  let sessionIndex: SessionIndex;
  let auditLogger: AuditLogger;
  const indexName = '.kibana_some_tenant_security_session_1';
  const indexTemplateName = '.kibana_some_tenant_security_session_index_template_1';
  beforeEach(() => {
    mockElasticsearchClient = elasticsearchServiceMock.createElasticsearchClient();
    auditLogger = auditLoggerMock.create();
    sessionIndex = new SessionIndex({
      logger: loggingSystemMock.createLogger(),
      kibanaIndexName: '.kibana_some_tenant',
      config: createConfig(
        ConfigSchema.validate({ session: { idleTimeout: null, lifespan: null } }),
        loggingSystemMock.createLogger(),
        { isTLSEnabled: false }
      ),
      elasticsearchClient: mockElasticsearchClient,
      auditLogger,
    });
  });

  describe('#initialize', () => {
    function assertExistenceChecksPerformed() {
      expect(mockElasticsearchClient.indices.existsTemplate).toHaveBeenCalledWith({
        name: indexTemplateName,
      });
      expect(mockElasticsearchClient.indices.existsIndexTemplate).toHaveBeenCalledWith({
        name: indexTemplateName,
      });
      expect(mockElasticsearchClient.indices.exists).toHaveBeenCalledWith({
        index: getSessionIndexTemplate(indexTemplateName, indexName).index_patterns[0],
      });
    }

    it('debounces initialize calls', async () => {
      mockElasticsearchClient.indices.existsTemplate.mockResponse(false);
      mockElasticsearchClient.indices.existsIndexTemplate.mockResponse(true);
      mockElasticsearchClient.indices.exists.mockResponse(true);

      await Promise.all([
        sessionIndex.initialize(),
        sessionIndex.initialize(),
        sessionIndex.initialize(),
        sessionIndex.initialize(),
      ]);

      assertExistenceChecksPerformed();
    });

    it('does not delete legacy index template if it does not exist and creates neither index template nor index if they exist', async () => {
      mockElasticsearchClient.indices.existsTemplate.mockResponse(false);
      mockElasticsearchClient.indices.existsIndexTemplate.mockResponse(true);
      mockElasticsearchClient.indices.exists.mockResponse(true);

      await sessionIndex.initialize();

      assertExistenceChecksPerformed();

      expect(mockElasticsearchClient.indices.deleteTemplate).not.toHaveBeenCalled();
      expect(mockElasticsearchClient.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(mockElasticsearchClient.indices.create).not.toHaveBeenCalled();
    });

    it('deletes legacy index template if needed and creates both index template and index if they do not exist', async () => {
      mockElasticsearchClient.indices.existsTemplate.mockResponse(true);
      mockElasticsearchClient.indices.existsIndexTemplate.mockResponse(false);
      mockElasticsearchClient.indices.exists.mockResponse(false);

      await sessionIndex.initialize();

      const expectedIndexTemplate = getSessionIndexTemplate(indexTemplateName, indexName);
      assertExistenceChecksPerformed();
      expect(mockElasticsearchClient.indices.deleteTemplate).toHaveBeenCalledWith({
        name: indexTemplateName,
      });
      expect(mockElasticsearchClient.indices.putIndexTemplate).toHaveBeenCalledWith(
        expectedIndexTemplate
      );
      expect(mockElasticsearchClient.indices.create).toHaveBeenCalledWith({
        index: expectedIndexTemplate.index_patterns[0],
      });
    });

    it('creates both index template and index if they do not exist', async () => {
      mockElasticsearchClient.indices.existsTemplate.mockResponse(false);
      mockElasticsearchClient.indices.existsIndexTemplate.mockResponse(false);
      mockElasticsearchClient.indices.exists.mockResponse(false);

      await sessionIndex.initialize();

      const expectedIndexTemplate = getSessionIndexTemplate(indexTemplateName, indexName);
      assertExistenceChecksPerformed();
      expect(mockElasticsearchClient.indices.deleteTemplate).not.toHaveBeenCalled();
      expect(mockElasticsearchClient.indices.putIndexTemplate).toHaveBeenCalledWith(
        expectedIndexTemplate
      );
      expect(mockElasticsearchClient.indices.create).toHaveBeenCalledWith({
        index: expectedIndexTemplate.index_patterns[0],
      });
    });

    it('creates only index template if it does not exist even if index exists', async () => {
      mockElasticsearchClient.indices.existsTemplate.mockResponse(false);
      mockElasticsearchClient.indices.existsIndexTemplate.mockResponse(false);
      mockElasticsearchClient.indices.exists.mockResponse(true);

      await sessionIndex.initialize();

      assertExistenceChecksPerformed();
      expect(mockElasticsearchClient.indices.deleteTemplate).not.toHaveBeenCalled();
      expect(mockElasticsearchClient.indices.putIndexTemplate).toHaveBeenCalledWith(
        getSessionIndexTemplate(indexTemplateName, indexName)
      );
    });

    it('creates only index if it does not exist even if index template exists', async () => {
      mockElasticsearchClient.indices.existsTemplate.mockResponse(false);
      mockElasticsearchClient.indices.existsIndexTemplate.mockResponse(true);
      mockElasticsearchClient.indices.exists.mockResponse(false);

      await sessionIndex.initialize();

      assertExistenceChecksPerformed();
      expect(mockElasticsearchClient.indices.deleteTemplate).not.toHaveBeenCalled();
      expect(mockElasticsearchClient.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(mockElasticsearchClient.indices.create).toHaveBeenCalledWith({
        index: getSessionIndexTemplate(indexTemplateName, indexName).index_patterns[0],
      });
    });

    it('does not fail if tries to create index when it exists already', async () => {
      mockElasticsearchClient.indices.existsTemplate.mockResponse(false);
      mockElasticsearchClient.indices.existsIndexTemplate.mockResponse(true);
      mockElasticsearchClient.indices.exists.mockResponse(false);
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
      mockElasticsearchClient.indices.existsIndexTemplate.mockRejectedValueOnce(unexpectedError);
      mockElasticsearchClient.indices.existsIndexTemplate.mockResponse(true);

      await expect(sessionIndex.initialize()).rejects.toBe(unexpectedError);
      await expect(sessionIndex.initialize()).resolves.toBe(undefined);
    });
  });

  describe('#cleanUp', () => {
    const now = 123456;
    const sessionValue = {
      _id: 'SESSION_ID',
      _source: { usernameHash: 'USERNAME_HASH', provider: { name: 'basic1', type: 'basic' } },
      sort: [0],
    };
    beforeEach(() => {
      mockElasticsearchClient.openPointInTime.mockResponse({
        id: 'PIT_ID',
      } as OpenPointInTimeResponse);
      mockElasticsearchClient.closePointInTime.mockResponse({
        succeeded: true,
        num_freed: 1,
      } as ClosePointInTimeResponse);
      mockElasticsearchClient.search.mockResponse({
        hits: { hits: [sessionValue] },
      } as SearchResponse);
      mockElasticsearchClient.bulk.mockResponse({ items: [{}] } as BulkResponse);
      jest.spyOn(Date, 'now').mockImplementation(() => now);
    });

    it('throws if search call to Elasticsearch fails', async () => {
      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse(securityMock.createApiResponse({ body: { type: 'Uh oh.' } }))
      );
      mockElasticsearchClient.search.mockRejectedValue(failureReason);

      await expect(sessionIndex.cleanUp()).rejects.toBe(failureReason);
      expect(mockElasticsearchClient.openPointInTime).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.search).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.bulk).not.toHaveBeenCalled();
      expect(mockElasticsearchClient.closePointInTime).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.indices.refresh).not.toHaveBeenCalled(); // since the search failed, we don't refresh the index
    });

    it('throws if bulk delete call to Elasticsearch fails', async () => {
      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse(securityMock.createApiResponse({ body: { type: 'Uh oh.' } }))
      );
      mockElasticsearchClient.bulk.mockRejectedValue(failureReason);

      await expect(sessionIndex.cleanUp()).rejects.toBe(failureReason);
      expect(mockElasticsearchClient.openPointInTime).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.search).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.bulk).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.closePointInTime).toHaveBeenCalledTimes(1); // since we attempted to delete sessions, we still refresh the index
    });

    it('does not throw if index refresh call to Elasticsearch fails', async () => {
      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse(securityMock.createApiResponse({ body: { type: 'Uh oh.' } }))
      );
      mockElasticsearchClient.indices.refresh.mockRejectedValue(failureReason);

      await sessionIndex.cleanUp();
      expect(mockElasticsearchClient.openPointInTime).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.search).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.bulk).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.closePointInTime).toHaveBeenCalledTimes(1); // since we attempted to delete sessions, we still refresh the index
    });

    it('when neither `lifespan` nor `idleTimeout` is configured', async () => {
      await sessionIndex.cleanUp();

      expect(mockElasticsearchClient.openPointInTime).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.search).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.search).toHaveBeenCalledWith({
        _source_includes: 'usernameHash,provider',
        sort: '_shard_doc',
        track_total_hits: false,
        search_after: undefined,
        size: 10_000,
        pit: {
          id: 'PIT_ID',
          keep_alive: '5m',
        },
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
      });
      expect(mockElasticsearchClient.bulk).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.bulk).toHaveBeenCalledWith(
        {
          index: indexName,
          operations: [{ delete: { _id: sessionValue._id } }],
          refresh: false,
        },
        {
          ignore: [409, 404],
        }
      );
      expect(mockElasticsearchClient.closePointInTime).toHaveBeenCalledTimes(1);
    });

    it('when only `lifespan` is configured', async () => {
      sessionIndex = new SessionIndex({
        logger: loggingSystemMock.createLogger(),
        kibanaIndexName: '.kibana_some_tenant',
        config: createConfig(
          ConfigSchema.validate({ session: { idleTimeout: null, lifespan: 456 } }),
          loggingSystemMock.createLogger(),
          { isTLSEnabled: false }
        ),
        elasticsearchClient: mockElasticsearchClient,
        auditLogger,
      });

      await sessionIndex.cleanUp();

      expect(mockElasticsearchClient.openPointInTime).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.search).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.search).toHaveBeenCalledWith({
        _source_includes: 'usernameHash,provider',
        sort: '_shard_doc',
        track_total_hits: false,
        search_after: undefined,
        size: 10_000,
        pit: {
          id: 'PIT_ID',
          keep_alive: '5m',
        },
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
      });
      expect(mockElasticsearchClient.bulk).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.bulk).toHaveBeenCalledWith(
        {
          index: indexName,
          operations: [{ delete: { _id: sessionValue._id } }],
          refresh: false,
        },
        {
          ignore: [409, 404],
        }
      );
      expect(mockElasticsearchClient.closePointInTime).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.indices.refresh).toHaveBeenCalledTimes(1);
    });

    it('when only `idleTimeout` is configured', async () => {
      const idleTimeout = 123;
      sessionIndex = new SessionIndex({
        logger: loggingSystemMock.createLogger(),
        kibanaIndexName: '.kibana_some_tenant',
        config: createConfig(
          ConfigSchema.validate({ session: { idleTimeout, lifespan: null } }),
          loggingSystemMock.createLogger(),
          { isTLSEnabled: false }
        ),
        elasticsearchClient: mockElasticsearchClient,
        auditLogger,
      });

      await sessionIndex.cleanUp();

      expect(mockElasticsearchClient.openPointInTime).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.search).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.search).toHaveBeenCalledWith({
        _source_includes: 'usernameHash,provider',
        sort: '_shard_doc',
        track_total_hits: false,
        search_after: undefined,
        size: 10_000,
        pit: {
          id: 'PIT_ID',
          keep_alive: '5m',
        },
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
      });
      expect(mockElasticsearchClient.bulk).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.bulk).toHaveBeenCalledWith(
        {
          index: indexName,
          operations: [{ delete: { _id: sessionValue._id } }],
          refresh: false,
        },
        {
          ignore: [409, 404],
        }
      );
      expect(mockElasticsearchClient.closePointInTime).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.indices.refresh).toHaveBeenCalledTimes(1);
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
        auditLogger,
      });

      await sessionIndex.cleanUp();

      expect(mockElasticsearchClient.openPointInTime).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.search).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.search).toHaveBeenCalledWith({
        _source_includes: 'usernameHash,provider',
        sort: '_shard_doc',
        track_total_hits: false,
        search_after: undefined,
        size: 10_000,
        pit: {
          id: 'PIT_ID',
          keep_alive: '5m',
        },
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
      });
      expect(mockElasticsearchClient.bulk).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.bulk).toHaveBeenCalledWith(
        {
          index: indexName,
          operations: [{ delete: { _id: sessionValue._id } }],
          refresh: false,
        },
        {
          ignore: [409, 404],
        }
      );
      expect(mockElasticsearchClient.closePointInTime).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.indices.refresh).toHaveBeenCalledTimes(1);
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
        auditLogger,
      });

      await sessionIndex.cleanUp();

      expect(mockElasticsearchClient.openPointInTime).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.search).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.search).toHaveBeenCalledWith({
        _source_includes: 'usernameHash,provider',
        sort: '_shard_doc',
        track_total_hits: false,
        search_after: undefined,
        size: 10_000,
        pit: {
          id: 'PIT_ID',
          keep_alive: '5m',
        },
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
      });
      expect(mockElasticsearchClient.bulk).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.bulk).toHaveBeenCalledWith(
        {
          index: indexName,
          operations: [{ delete: { _id: sessionValue._id } }],
          refresh: false,
        },
        {
          ignore: [409, 404],
        }
      );
      expect(mockElasticsearchClient.closePointInTime).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.indices.refresh).toHaveBeenCalledTimes(1);
    });

    it('should clean up sessions in batches of 10,000', async () => {
      for (const count of [10_000, 1]) {
        mockElasticsearchClient.search.mockResponseOnce({
          hits: { hits: new Array(count).fill(sessionValue, 0) },
        } as SearchResponse);
      }

      await sessionIndex.cleanUp();

      expect(mockElasticsearchClient.openPointInTime).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.search).toHaveBeenCalledTimes(2);
      expect(mockElasticsearchClient.bulk).toHaveBeenCalledTimes(2);
      expect(mockElasticsearchClient.closePointInTime).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.indices.refresh).toHaveBeenCalledTimes(1);
    });

    it('should limit number of batches to 10', async () => {
      mockElasticsearchClient.search.mockResponse({
        hits: { hits: new Array(10_000).fill(sessionValue, 0) },
      } as SearchResponse);

      await sessionIndex.cleanUp();

      expect(mockElasticsearchClient.openPointInTime).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.search).toHaveBeenCalledTimes(10);
      expect(mockElasticsearchClient.bulk).toHaveBeenCalledTimes(10);
      expect(mockElasticsearchClient.closePointInTime).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.indices.refresh).toHaveBeenCalledTimes(1);
    });

    it('should log audit event', async () => {
      await sessionIndex.cleanUp();

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: { action: 'session_cleanup', category: ['authentication'], outcome: 'unknown' },
        })
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
      mockElasticsearchClient.get.mockResponse({
        _index: 'my-index',
        // @ts-expect-error incomplete definition
        _type: '_doc',
        _id: '0',
        found: false,
      });

      await expect(sessionIndex.get('some-sid')).resolves.toBeNull();
    });

    it('returns `null` if session index value document is not found', async () => {
      mockElasticsearchClient.get.mockResponse({
        _index: 'my-index',
        // @ts-expect-error incomplete definition
        _type: '_doc',
        _id: '0',
        found: false,
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

      mockElasticsearchClient.get.mockResponse({
        found: true,
        _index: 'my-index',
        // @ts-expect-error incomplete definition
        _type: '_doc',
        _id: '0',
        _source: indexDocumentSource,
        _primary_term: 1,
        _seq_no: 456,
      });

      await expect(sessionIndex.get('some-sid')).resolves.toEqual({
        ...indexDocumentSource,
        sid: 'some-sid',
        metadata: { primaryTerm: 1, sequenceNumber: 456 },
      });

      expect(mockElasticsearchClient.get).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.get).toHaveBeenCalledWith(
        { id: 'some-sid', index: indexName },
        { ignore: [404], meta: true }
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
      mockElasticsearchClient.create.mockResponse({
        _shards: { total: 1, failed: 0, successful: 1, skipped: 0 },
        _index: 'my-index',
        _id: 'W0tpsmIBdwcYyG50zbta',
        _version: 1,
        _primary_term: 321,
        _seq_no: 654,
        result: 'created',
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

    it('re-fetches latest session value if update fails due to conflict', async () => {
      const latestSessionValue = {
        usernameHash: 'some-username-hash',
        provider: { type: 'basic', name: 'basic1' },
        idleTimeoutExpiration: 100,
        lifespanExpiration: 200,
        content: 'some-updated-encrypted-content',
      };

      mockElasticsearchClient.get.mockResponse({
        _index: 'my-index',
        // @ts-expect-error incomplete definition
        _type: '_doc',
        _id: '0',
        _source: latestSessionValue,
        _primary_term: 321,
        _seq_no: 654,
        found: true,
      });
      mockElasticsearchClient.index.mockResponse(
        {
          _shards: { total: 1, failed: 0, successful: 1, skipped: 0 },
          _index: 'my-index',
          _id: 'W0tpsmIBdwcYyG50zbta',
          _version: 1,
          _primary_term: 321,
          _seq_no: 654,
          result: 'updated',
        },
        { statusCode: 409 }
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
        { ignore: [409], meta: true }
      );
    });

    it('properly stores session value in the index', async () => {
      mockElasticsearchClient.index.mockResponse({
        _shards: { total: 1, failed: 0, successful: 1, skipped: 0 },
        _index: 'my-index',
        _id: 'W0tpsmIBdwcYyG50zbta',
        _version: 1,
        _primary_term: 321,
        _seq_no: 654,
        result: 'created',
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
        { ignore: [409], meta: true }
      );
    });
  });

  describe('#invalidate', () => {
    beforeEach(() => {
      mockElasticsearchClient.deleteByQuery.mockResponse({ deleted: 10 });
    });

    it('[match=sid] throws if call to Elasticsearch fails', async () => {
      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse(securityMock.createApiResponse({ body: { type: 'Uh oh.' } }))
      );
      mockElasticsearchClient.delete.mockRejectedValue(failureReason);

      await expect(sessionIndex.invalidate({ match: 'sid', sid: 'some-long-sid' })).rejects.toBe(
        failureReason
      );
    });

    it('[match=sid] properly removes session value from the index', async () => {
      await sessionIndex.invalidate({ match: 'sid', sid: 'some-long-sid' });

      expect(mockElasticsearchClient.delete).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.delete).toHaveBeenCalledWith(
        { id: 'some-long-sid', index: indexName, refresh: 'wait_for' },
        { ignore: [404], meta: true }
      );
    });

    it('[match=all] throws if call to Elasticsearch fails', async () => {
      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse(securityMock.createApiResponse({ body: { type: 'Uh oh.' } }))
      );
      mockElasticsearchClient.deleteByQuery.mockRejectedValue(failureReason);

      await expect(sessionIndex.invalidate({ match: 'all' })).rejects.toBe(failureReason);
    });

    it('[match=all] properly constructs query', async () => {
      await expect(sessionIndex.invalidate({ match: 'all' })).resolves.toBe(10);

      expect(mockElasticsearchClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.deleteByQuery).toHaveBeenCalledWith({
        index: indexName,
        refresh: true,
        body: { query: { match_all: {} } },
      });
    });

    it('[match=query] throws if call to Elasticsearch fails', async () => {
      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse(securityMock.createApiResponse({ body: { type: 'Uh oh.' } }))
      );
      mockElasticsearchClient.deleteByQuery.mockRejectedValue(failureReason);

      await expect(
        sessionIndex.invalidate({ match: 'query', query: { provider: { type: 'basic' } } })
      ).rejects.toBe(failureReason);
    });

    it('[match=query] when only provider type is specified', async () => {
      await expect(
        sessionIndex.invalidate({ match: 'query', query: { provider: { type: 'basic' } } })
      ).resolves.toBe(10);

      expect(mockElasticsearchClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.deleteByQuery).toHaveBeenCalledWith({
        index: indexName,
        refresh: true,
        body: { query: { bool: { must: [{ term: { 'provider.type': 'basic' } }] } } },
      });
    });

    it('[match=query] when both provider type and provider name are specified', async () => {
      await expect(
        sessionIndex.invalidate({
          match: 'query',
          query: { provider: { type: 'basic', name: 'basic1' } },
        })
      ).resolves.toBe(10);

      expect(mockElasticsearchClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.deleteByQuery).toHaveBeenCalledWith({
        index: indexName,
        refresh: true,
        body: {
          query: {
            bool: {
              must: [
                { term: { 'provider.type': 'basic' } },
                { term: { 'provider.name': 'basic1' } },
              ],
            },
          },
        },
      });
    });

    it('[match=query] when both provider type and username hash are specified', async () => {
      await expect(
        sessionIndex.invalidate({
          match: 'query',
          query: { provider: { type: 'basic' }, usernameHash: 'some-hash' },
        })
      ).resolves.toBe(10);

      expect(mockElasticsearchClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.deleteByQuery).toHaveBeenCalledWith({
        index: indexName,
        refresh: true,
        body: {
          query: {
            bool: {
              must: [
                { term: { 'provider.type': 'basic' } },
                { term: { usernameHash: 'some-hash' } },
              ],
            },
          },
        },
      });
    });

    it('[match=query] when provider type, provider name, and username hash are specified', async () => {
      await expect(
        sessionIndex.invalidate({
          match: 'query',
          query: { provider: { type: 'basic', name: 'basic1' }, usernameHash: 'some-hash' },
        })
      ).resolves.toBe(10);

      expect(mockElasticsearchClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(mockElasticsearchClient.deleteByQuery).toHaveBeenCalledWith({
        index: indexName,
        refresh: true,
        body: {
          query: {
            bool: {
              must: [
                { term: { 'provider.type': 'basic' } },
                { term: { 'provider.name': 'basic1' } },
                { term: { usernameHash: 'some-hash' } },
              ],
            },
          },
        },
      });
    });
  });
});
