/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { DataStreamSpacesAdapter } from '@kbn/data-stream-adapter';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { kibanaPackageJson } from '@kbn/repo-info';

import type { HostMetadata } from '../../../../common/endpoint/types';
import type { SearchParams } from '../../../../common/endpoint/types/workflow_insights';

import {
  ActionType,
  Category,
  SourceType,
} from '../../../../common/endpoint/types/workflow_insights';
import type { EndpointMetadataService } from '../metadata';
import {
  buildEsQueryParams,
  createDatastream,
  createPipeline,
  groupEndpointIdsByOS,
} from './helpers';
import {
  COMPONENT_TEMPLATE_NAME,
  DATA_STREAM_PREFIX,
  INDEX_TEMPLATE_NAME,
  INGEST_PIPELINE_NAME,
  TOTAL_FIELDS_LIMIT,
} from './constants';
import { securityWorkflowInsightsFieldMap } from './field_map_configurations';
import { createMockEndpointAppContext } from '../../mocks';

jest.mock('@kbn/data-stream-adapter', () => ({
  DataStreamSpacesAdapter: jest.fn().mockImplementation(() => ({
    setComponentTemplate: jest.fn(),
    setIndexTemplate: jest.fn(),
  })),
}));

describe('helpers', () => {
  describe('createDatastream', () => {
    it('should create a DataStreamSpacesAdapter with the correct configuration', () => {
      const kibanaVersion = kibanaPackageJson.version;
      const ds = createDatastream(kibanaVersion);

      expect(DataStreamSpacesAdapter).toHaveBeenCalledTimes(1);
      expect(DataStreamSpacesAdapter).toHaveBeenCalledWith(DATA_STREAM_PREFIX, {
        kibanaVersion,
        totalFieldsLimit: TOTAL_FIELDS_LIMIT,
      });
      expect(ds.setComponentTemplate).toHaveBeenCalledTimes(1);
      expect(ds.setComponentTemplate).toHaveBeenCalledWith({
        name: COMPONENT_TEMPLATE_NAME,
        fieldMap: securityWorkflowInsightsFieldMap,
      });
      expect(ds.setIndexTemplate).toHaveBeenCalledTimes(1);
      expect(ds.setIndexTemplate).toHaveBeenCalledWith({
        name: INDEX_TEMPLATE_NAME,
        componentTemplateRefs: [COMPONENT_TEMPLATE_NAME],
        template: {
          settings: {
            default_pipeline: INGEST_PIPELINE_NAME,
          },
        },
        hidden: true,
      });
    });
  });

  describe('createPipeline', () => {
    let esClient: ElasticsearchClient;

    beforeEach(() => {
      esClient = elasticsearchServiceMock.createElasticsearchClient();
    });

    it('should create an ingest pipeline with the correct configuration', async () => {
      await createPipeline(esClient);

      expect(esClient.ingest.putPipeline).toHaveBeenCalledTimes(1);
      expect(esClient.ingest.putPipeline).toHaveBeenCalledWith({
        id: INGEST_PIPELINE_NAME,
        processors: [],
        _meta: {
          managed: true,
        },
      });
    });
  });

  describe('buildEsQueryParams', () => {
    it('should build query with valid keys', () => {
      const searchParams: SearchParams = {
        ids: ['id1', 'id2'],
        categories: [Category.Endpoint],
        types: ['incompatible_antivirus'],
        sourceTypes: [SourceType.LlmConnector],
        sourceIds: ['source1'],
        targetIds: ['target1'],
        actionTypes: [ActionType.Refreshed],
      };
      const result = buildEsQueryParams(searchParams);
      expect(result).toEqual([
        { terms: { _id: ['id1', 'id2'] } },
        { terms: { categories: ['endpoint'] } },
        { terms: { types: ['incompatible_antivirus'] } },
        { nested: { path: 'source', query: { terms: { 'source.type': ['llm-connector'] } } } },
        { nested: { path: 'source', query: { terms: { 'source.id': ['source1'] } } } },
        { nested: { path: 'target', query: { terms: { 'target.ids': ['target1'] } } } },
        { nested: { path: 'action', query: { terms: { 'action.type': ['refreshed'] } } } },
      ]);
    });

    it('should ignore invalid keys', () => {
      const searchParams = {
        invalidKey: 'invalidValue',
        ids: ['id1'],
      } as unknown as SearchParams;
      const result = buildEsQueryParams(searchParams);
      expect(result).toEqual([{ terms: { _id: ['id1'] } }]);
    });

    it('should handle empty searchParams', () => {
      const searchParams: SearchParams = {};
      const result = buildEsQueryParams(searchParams);
      expect(result).toEqual([]);
    });

    it('should handle nested query for actionTypes', () => {
      const searchParams: SearchParams = {
        actionTypes: [ActionType.Refreshed],
      };
      const result = buildEsQueryParams(searchParams);
      expect(result).toEqual([
        { nested: { path: 'action', query: { terms: { 'action.type': ['refreshed'] } } } },
      ]);
    });

    it('should handle nested query for targetIds', () => {
      const searchParams: SearchParams = {
        targetIds: ['target1'],
      };
      const result = buildEsQueryParams(searchParams);
      expect(result).toEqual([
        { nested: { path: 'target', query: { terms: { 'target.ids': ['target1'] } } } },
      ]);
    });
  });

  describe('groupEndpointIdsByOS', () => {
    let endpointMetadataService: jest.Mocked<EndpointMetadataService>;

    beforeEach(() => {
      const mockEndpointAppContextService = createMockEndpointAppContext().service;
      mockEndpointAppContextService.getEndpointMetadataService = jest.fn().mockReturnValue({
        getMetadataForEndpoints: jest.fn(),
      });
      endpointMetadataService =
        mockEndpointAppContextService.getEndpointMetadataService() as jest.Mocked<EndpointMetadataService>;
    });

    it('should correctly group endpoint IDs by OS type', async () => {
      const endpointIds = ['endpoint1', 'endpoint2', 'endpoint3'];
      const metadata = [
        {
          host: { os: { name: 'Windows' } },
          agent: { id: 'agent1' },
        },
        {
          host: { os: { name: 'Linux' } },
          agent: { id: 'agent2' },
        },
        {
          host: { os: { name: 'MacOS' } },
          agent: { id: 'agent3' },
        },
      ] as HostMetadata[];

      endpointMetadataService.getMetadataForEndpoints.mockResolvedValue(metadata);

      const result = await groupEndpointIdsByOS(endpointIds, endpointMetadataService);

      expect(result).toEqual({
        windows: ['agent1'],
        linux: ['agent2'],
        macos: ['agent3'],
      });
    });
  });
});
