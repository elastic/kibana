/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { httpServerMock, loggingSystemMock } from '../../../../../../../src/core/server/mocks';
import { kibanaRequestToMetadataListESQuery, getESQueryHostMetadataByID } from './query_builders';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import { createMockConfig } from '../../../lib/detection_engine/routes/__mocks__';
import { metadataCurrentIndexPattern } from '../../../../common/endpoint/constants';
import { metadataQueryStrategyV2 } from './support/query_strategies';

describe('query builder', () => {
  describe('MetadataListESQuery', () => {
    it('queries the correct index', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({ body: {} });
      const query = await kibanaRequestToMetadataListESQuery(
        mockRequest,
        {
          logFactory: loggingSystemMock.create(),
          service: new EndpointAppContextService(),
          config: () => Promise.resolve(createMockConfig()),
        },
        metadataQueryStrategyV2()
      );
      expect(query.index).toEqual(metadataCurrentIndexPattern);
    });

    it('sorts using *event.created', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({ body: {} });
      const query = await kibanaRequestToMetadataListESQuery(
        mockRequest,
        {
          logFactory: loggingSystemMock.create(),
          service: new EndpointAppContextService(),
          config: () => Promise.resolve(createMockConfig()),
        },
        metadataQueryStrategyV2()
      );
      expect(query.body.sort).toContainEqual({
        'event.created': {
          order: 'desc',
          unmapped_type: 'date',
        },
      });
      expect(query.body.sort).toContainEqual({
        'HostDetails.event.created': {
          order: 'desc',
          unmapped_type: 'date',
        },
      });
    });

    it('queries for all endpoints when no specific parameters requested', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        body: {},
      });
      const query = await kibanaRequestToMetadataListESQuery(
        mockRequest,
        {
          logFactory: loggingSystemMock.create(),
          service: new EndpointAppContextService(),
          config: () => Promise.resolve(createMockConfig()),
        },
        metadataQueryStrategyV2()
      );
      expect(query.body.query).toHaveProperty('match_all');
    });

    it('excludes unenrolled elastic agents when they exist, by default', async () => {
      const unenrolledElasticAgentId = '1fdca33f-799f-49f4-939c-ea4383c77672';
      const mockRequest = httpServerMock.createKibanaRequest({
        body: {},
      });
      const query = await kibanaRequestToMetadataListESQuery(
        mockRequest,
        {
          logFactory: loggingSystemMock.create(),
          service: new EndpointAppContextService(),
          config: () => Promise.resolve(createMockConfig()),
        },
        metadataQueryStrategyV2(),
        {
          unenrolledAgentIds: [unenrolledElasticAgentId],
        }
      );

      expect(query.body.query).toEqual({
        bool: {
          must_not: [
            { terms: { 'elastic.agent.id': [unenrolledElasticAgentId] } },
            { terms: { 'HostDetails.elastic.agent.id': [unenrolledElasticAgentId] } },
          ],
        },
      });
    });
  });

  describe('test query builder with kql filter', () => {
    it('test default query params for all endpoints metadata when body filter is provided', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        body: {
          filters: { kql: 'not host.ip:10.140.73.246' },
        },
      });
      const query = await kibanaRequestToMetadataListESQuery(
        mockRequest,
        {
          logFactory: loggingSystemMock.create(),
          service: new EndpointAppContextService(),
          config: () => Promise.resolve(createMockConfig()),
        },
        metadataQueryStrategyV2()
      );

      expect(query.body.query.bool.must).toContainEqual({
        bool: {
          must_not: {
            bool: {
              should: [
                {
                  match: {
                    'host.ip': '10.140.73.246',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        },
      });
    });

    it(
      'test default query params for all endpoints endpoint metadata excluding unerolled endpoint ' +
        'and when body filter is provided',
      async () => {
        const unenrolledElasticAgentId = '1fdca33f-799f-49f4-939c-ea4383c77672';
        const mockRequest = httpServerMock.createKibanaRequest({
          body: {
            filters: { kql: 'not host.ip:10.140.73.246' },
          },
        });
        const query = await kibanaRequestToMetadataListESQuery(
          mockRequest,
          {
            logFactory: loggingSystemMock.create(),
            service: new EndpointAppContextService(),
            config: () => Promise.resolve(createMockConfig()),
          },
          metadataQueryStrategyV2(),
          {
            unenrolledAgentIds: [unenrolledElasticAgentId],
          }
        );

        expect(query.body.query.bool.must).toContainEqual({
          bool: {
            must_not: [
              // both of these should exist, since the schema can be *either*
              { terms: { 'elastic.agent.id': [unenrolledElasticAgentId] } },
              { terms: { 'HostDetails.elastic.agent.id': [unenrolledElasticAgentId] } },
            ],
          },
        });
        expect(query.body.query.bool.must).toContainEqual({
          bool: {
            must_not: {
              bool: {
                should: [
                  {
                    match: {
                      'host.ip': '10.140.73.246',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          },
        });
      }
    );
  });

  describe('MetadataGetQuery', () => {
    it('searches the correct index', () => {
      const query = getESQueryHostMetadataByID('nonsense-id', metadataQueryStrategyV2());
      expect(query.index).toEqual(metadataCurrentIndexPattern);
    });

    it('searches for the correct ID', () => {
      const mockID = 'AABBCCDD-0011-2233-AA44-DEADBEEF8899';
      const query = getESQueryHostMetadataByID(mockID, metadataQueryStrategyV2());

      expect(query.body.query.bool.filter).toContainEqual({
        term: { 'agent.id': mockID },
      });
    });

    it('supports HostDetails in schema for backwards compat', () => {
      const mockID = 'AABBCCDD-0011-2233-AA44-DEADBEEF8899';
      const query = getESQueryHostMetadataByID(mockID, metadataQueryStrategyV2());

      expect(query.body.query.bool.filter).toContainEqual({
        term: { 'HostDetails.agent.id': mockID },
      });
    });
  });
});
