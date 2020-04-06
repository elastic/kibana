/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { httpServerMock, loggingServiceMock } from '../../../../../../src/core/server/mocks';
import { EndpointConfigSchema } from '../../config';
import { kibanaRequestToMetadataListESQuery, getESQueryHostMetadataByID } from './query_builders';
import { IndexPatternService } from '../../../../ingest_manager/server';
import { SavedObjectsClientContract } from 'kibana/server';

export const MetadataIndexPattern = 'metadata-endpoint-*';

export class FakeIndexPatternService implements IndexPatternService {
  constructor(private readonly indexPattern: string) {}

  static buildMetadataService() {
    return new FakeIndexPatternService(MetadataIndexPattern);
  }

  async get(
    savedObjectsClient: SavedObjectsClientContract,
    pkgName: string,
    datasetPath: string,
    version?: string
  ): Promise<string | undefined> {
    return this.indexPattern;
  }
}

describe('query builder', () => {
  describe('MetadataListESQuery', () => {
    it('test default query params for all endpoints metadata when no params or body is provided', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        body: {},
      });
      const query = await kibanaRequestToMetadataListESQuery(
        mockRequest,
        {
          ingestManager: { indexPatternService: FakeIndexPatternService.buildMetadataService() },
          logFactory: loggingServiceMock.create(),
          config: () => Promise.resolve(EndpointConfigSchema.validate({})),
        },
        MetadataIndexPattern
      );
      expect(query).toEqual({
        body: {
          query: {
            match_all: {},
          },
          collapse: {
            field: 'host.id',
            inner_hits: {
              name: 'most_recent',
              size: 1,
              sort: [{ 'event.created': 'desc' }],
            },
          },
          aggs: {
            total: {
              cardinality: {
                field: 'host.id',
              },
            },
          },
          sort: [
            {
              'event.created': {
                order: 'desc',
              },
            },
          ],
        },
        from: 0,
        size: 10,
        index: MetadataIndexPattern,
      } as Record<string, any>);
    });
  });

  describe('test query builder with kql filter', () => {
    it('test default query params for all endpoints metadata when body filter is provided', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        body: {
          filter: 'not host.ip:10.140.73.246',
        },
      });
      const query = await kibanaRequestToMetadataListESQuery(
        mockRequest,
        {
          ingestManager: { indexPatternService: FakeIndexPatternService.buildMetadataService() },
          logFactory: loggingServiceMock.create(),
          config: () => Promise.resolve(EndpointConfigSchema.validate({})),
        },
        MetadataIndexPattern
      );
      expect(query).toEqual({
        body: {
          query: {
            bool: {
              must_not: {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      match: {
                        'host.ip': '10.140.73.246',
                      },
                    },
                  ],
                },
              },
            },
          },
          collapse: {
            field: 'host.id',
            inner_hits: {
              name: 'most_recent',
              size: 1,
              sort: [{ 'event.created': 'desc' }],
            },
          },
          aggs: {
            total: {
              cardinality: {
                field: 'host.id',
              },
            },
          },
          sort: [
            {
              'event.created': {
                order: 'desc',
              },
            },
          ],
        },
        from: 0,
        size: 10,
        index: MetadataIndexPattern,
      } as Record<string, any>);
    });
  });

  describe('MetadataGetQuery', () => {
    it('searches for the correct ID', () => {
      const mockID = 'AABBCCDD-0011-2233-AA44-DEADBEEF8899';
      const query = getESQueryHostMetadataByID(mockID, MetadataIndexPattern);

      expect(query).toEqual({
        body: {
          query: { match: { 'host.id': mockID } },
          sort: [{ 'event.created': { order: 'desc' } }],
          size: 1,
        },
        index: MetadataIndexPattern,
      });
    });
  });
});
