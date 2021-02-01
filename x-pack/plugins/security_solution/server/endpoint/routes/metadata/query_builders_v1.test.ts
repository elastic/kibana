/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { httpServerMock, loggingSystemMock } from '../../../../../../../src/core/server/mocks';
import { kibanaRequestToMetadataListESQuery, getESQueryHostMetadataByID } from './query_builders';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import { createMockConfig } from '../../../lib/detection_engine/routes/__mocks__';
import { metadataIndexPattern } from '../../../../common/endpoint/constants';
import { metadataQueryStrategyV1 } from './support/query_strategies';

describe('query builder v1', () => {
  describe('MetadataListESQuery', () => {
    it('test default query params for all endpoints metadata when no params or body is provided', async () => {
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
        metadataQueryStrategyV1()
      );

      expect(query.body.query).toHaveProperty('match_all'); // no filtering
      expect(query.body.collapse).toEqual({
        field: 'agent.id',
        inner_hits: {
          name: 'most_recent',
          size: 1,
          sort: [{ 'event.created': 'desc' }],
        },
      });
      expect(query.body.aggs).toEqual({
        total: {
          cardinality: {
            field: 'agent.id',
          },
        },
      });
      expect(query.index).toEqual(metadataIndexPattern);
    });

    it(
      'test default query params for all endpoints metadata when no params or body is provided ' +
        'with unenrolled host ids excluded',
      async () => {
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
          metadataQueryStrategyV1(),
          {
            unenrolledAgentIds: [unenrolledElasticAgentId],
          }
        );
        expect(Object.keys(query.body.query.bool)).toEqual(['must_not']); // only filtering out unenrolled
        expect(query.body.query.bool.must_not).toContainEqual({
          terms: { 'elastic.agent.id': [unenrolledElasticAgentId] },
        });
      }
    );
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
        metadataQueryStrategyV1()
      );
      expect(query.body.query.bool.must).toHaveLength(1); // should not be any other filtering happening
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
          metadataQueryStrategyV1(),
          {
            unenrolledAgentIds: [unenrolledElasticAgentId],
          }
        );

        expect(query.body.query.bool.must.length).toBeGreaterThan(1);
        // unenrollment filter should be there
        expect(query.body.query.bool.must).toContainEqual({
          bool: {
            must_not: [
              { terms: { 'elastic.agent.id': [unenrolledElasticAgentId] } },
              // below is not actually necessary behavior for v1, but hard to structure the test to ignore it
              { terms: { 'HostDetails.elastic.agent.id': [unenrolledElasticAgentId] } },
            ],
          },
        });
        // and KQL should also be there
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
    it('searches for the correct ID', () => {
      const mockID = 'AABBCCDD-0011-2233-AA44-DEADBEEF8899';
      const query = getESQueryHostMetadataByID(mockID, metadataQueryStrategyV1());

      expect(query.body.query.bool.filter).toContainEqual({
        term: { 'agent.id': mockID },
      });
    });
  });
});
