/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { DataStreamSpacesAdapter } from '@kbn/data-stream-adapter';
import { DefendInsightType } from '@kbn/elastic-assistant-common';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { kibanaPackageJson } from '@kbn/repo-info';

import type { SearchParams } from '../../../../common/endpoint/types/workflow_insights';

import { buildEsQueryParams, createDatastream, createPipeline } from './helpers';
import {
  DATA_STREAM_PREFIX,
  COMPONENT_TEMPLATE_NAME,
  INDEX_TEMPLATE_NAME,
  INGEST_PIPELINE_NAME,
  TOTAL_FIELDS_LIMIT,
} from './constants';
import { securityWorkflowInsightsFieldMap } from './field_map_configurations';
import {
  ActionType,
  Category,
  SourceType,
  TargetType,
} from '../../../../common/endpoint/types/workflow_insights';

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
    it('should build es query correct', () => {
      const searchParams: SearchParams = {
        size: 50,
        from: 50,
        ids: ['id1', 'id2'],
        categories: [Category.Endpoint],
        types: [DefendInsightType.Enum.incompatible_antivirus],
        sourceTypes: [SourceType.LlmConnector],
        sourceIds: ['source-id1', 'source-id2'],
        targetTypes: [TargetType.Endpoint],
        targetIds: ['target-id1', 'target-id2'],
        actionTypes: [ActionType.Refreshed, ActionType.Remediated],
      };
      const result = buildEsQueryParams(searchParams);
      expect(result).toEqual([
        {
          terms: {
            _id: ['id1', 'id2'],
          },
        },
        {
          terms: {
            categories: ['endpoint'],
          },
        },
        {
          terms: {
            types: ['incompatible_antivirus'],
          },
        },
        {
          terms: {
            'source.type': ['llm-connector'],
          },
        },
        {
          terms: {
            'source.id': ['source-id1', 'source-id2'],
          },
        },
        {
          terms: {
            'target.type': ['endpoint'],
          },
        },
        {
          terms: {
            'target.id': ['target-id1', 'target-id2'],
          },
        },
        {
          terms: {
            'action.type': ['refreshed', 'remediated'],
          },
        },
      ]);
    });
  });
});
