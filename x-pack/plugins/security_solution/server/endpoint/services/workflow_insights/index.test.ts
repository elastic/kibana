/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import moment from 'moment';
import { ReplaySubject } from 'rxjs';

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import { DataStreamSpacesAdapter } from '@kbn/data-stream-adapter';
import { DefendInsightType } from '@kbn/elastic-assistant-common';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { kibanaPackageJson } from '@kbn/repo-info';
import { loggerMock } from '@kbn/logging-mocks';

import type {
  SearchParams,
  SecurityWorkflowInsight,
} from '../../../../common/endpoint/types/workflow_insights';

import {
  Category,
  SourceType,
  TargetType,
  ActionType,
} from '../../../../common/endpoint/types/workflow_insights';
import { createDatastream, createPipeline } from './helpers';
import { securityWorkflowInsightsService } from '.';
import { DATA_STREAM_NAME } from './constants';

jest.mock('./helpers', () => {
  const original = jest.requireActual('./helpers');
  return {
    ...original,
    createDatastream: jest.fn(),
    createPipeline: jest.fn(),
  };
});

function getDefaultInsight(overrides?: Partial<SecurityWorkflowInsight>): SecurityWorkflowInsight {
  const defaultInsight = {
    '@timestamp': moment(),
    message: 'This is a test message',
    category: Category.Endpoint,
    type: DefendInsightType.Enum.incompatible_antivirus,
    source: {
      type: SourceType.LlmConnector,
      id: 'openai-connector-id',
      data_range_start: moment(),
      data_range_end: moment(),
    },
    target: {
      type: TargetType.Endpoint,
      ids: ['endpoint-1', 'endpoint-2'],
    },
    action: {
      type: ActionType.Refreshed,
      timestamp: moment(),
    },
    value: 'unique-key',
    remediation: {
      exception_list_items: [
        {
          list_id: 'example-list-id',
          name: 'Example List Name',
          description: 'Example description',
          entries: [
            {
              field: 'example-field',
              operator: 'included',
              type: 'match',
              value: 'example-value',
            },
          ],
          tags: ['example-tag'],
          os_types: ['windows', 'linux'],
        },
      ],
    },
    metadata: {
      notes: {
        key1: 'value1',
        key2: 'value2',
      },
      message_variables: ['variable1', 'variable2'],
    },
  };
  return merge(defaultInsight, overrides);
}

describe('SecurityWorkflowInsightsService', () => {
  let logger: Logger;
  let esClient: ElasticsearchClient;

  beforeEach(() => {
    logger = loggerMock.create();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setup', () => {
    it('should set up the data stream', () => {
      const createDatastreamMock = createDatastream as jest.Mock;
      createDatastreamMock.mockReturnValueOnce(
        new DataStreamSpacesAdapter(DATA_STREAM_NAME, {
          kibanaVersion: kibanaPackageJson.version,
        })
      );

      securityWorkflowInsightsService.setup({
        kibanaVersion: kibanaPackageJson.version,
        logger,
        isFeatureEnabled: true,
      });

      expect(createDatastreamMock).toHaveBeenCalledTimes(1);
      expect(createDatastreamMock).toHaveBeenCalledWith(kibanaPackageJson.version);
    });

    it('should log a warning if createDatastream throws an error', () => {
      const createDatastreamMock = createDatastream as jest.Mock;
      createDatastreamMock.mockImplementation(() => {
        throw new Error('test error');
      });

      securityWorkflowInsightsService.setup({
        kibanaVersion: kibanaPackageJson.version,
        logger,
        isFeatureEnabled: true,
      });

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('test error'));
    });
  });

  describe('start', () => {
    it('should start the service', async () => {
      const createDatastreamMock = createDatastream as jest.Mock;
      const ds = new DataStreamSpacesAdapter(DATA_STREAM_NAME, {
        kibanaVersion: kibanaPackageJson.version,
      });
      const dsInstallSpy = jest.spyOn(ds, 'install');
      dsInstallSpy.mockResolvedValueOnce();
      createDatastreamMock.mockReturnValueOnce(ds);
      const createPipelineMock = createPipeline as jest.Mock;
      createPipelineMock.mockResolvedValueOnce(true);
      const createDataStreamMock = esClient.indices.createDataStream as jest.Mock;

      securityWorkflowInsightsService.setup({
        kibanaVersion: kibanaPackageJson.version,
        logger,
        isFeatureEnabled: true,
      });
      expect(createDatastreamMock).toHaveBeenCalledTimes(1);
      expect(createDatastreamMock).toHaveBeenCalledWith(kibanaPackageJson.version);

      await securityWorkflowInsightsService.start({ esClient });

      expect(createPipelineMock).toHaveBeenCalledTimes(1);
      expect(createPipelineMock).toHaveBeenCalledWith(esClient);
      expect(dsInstallSpy).toHaveBeenCalledTimes(1);
      expect(dsInstallSpy).toHaveBeenCalledWith({
        logger,
        esClient,
        pluginStop$: expect.any(ReplaySubject),
      });
      expect(createDataStreamMock).toHaveBeenCalledTimes(1);
      expect(createDataStreamMock).toHaveBeenCalledWith({ name: DATA_STREAM_NAME });
    });

    it('should log a warning if createPipeline or ds.install throws an error', async () => {
      securityWorkflowInsightsService.setup({
        kibanaVersion: kibanaPackageJson.version,
        logger,
        isFeatureEnabled: true,
      });

      const createPipelineMock = createPipeline as jest.Mock;
      createPipelineMock.mockImplementationOnce(() => {
        throw new Error('test error');
      });

      await securityWorkflowInsightsService.start({ esClient });

      expect(logger.warn).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenNthCalledWith(1, expect.stringContaining('test error'));
    });
  });

  describe('create', () => {
    it('should index the doc correctly', async () => {
      const isInitializedSpy = jest
        .spyOn(securityWorkflowInsightsService, 'isInitialized', 'get')
        .mockResolvedValueOnce([undefined, undefined]);

      await securityWorkflowInsightsService.start({ esClient });
      const insight = getDefaultInsight();
      await securityWorkflowInsightsService.create(insight);

      // ensure it waits for initialization first
      expect(isInitializedSpy).toHaveBeenCalledTimes(1);
      // indexes the doc
      expect(esClient.index).toHaveBeenCalledTimes(1);
      expect(esClient.index).toHaveBeenCalledWith({
        index: DATA_STREAM_NAME,
        body: insight,
        refresh: 'wait_for',
      });
    });
  });

  describe('update', () => {
    it('should update the doc correctly', async () => {
      const isInitializedSpy = jest
        .spyOn(securityWorkflowInsightsService, 'isInitialized', 'get')
        .mockResolvedValueOnce([undefined, undefined]);

      await securityWorkflowInsightsService.start({ esClient });
      const insightId = 'some-insight-id';
      const insight = getDefaultInsight();
      const indexName = 'backing-index-name';
      await securityWorkflowInsightsService.update(insightId, insight, indexName);

      // ensure it waits for initialization first
      expect(isInitializedSpy).toHaveBeenCalledTimes(1);
      // updates the doc
      expect(esClient.update).toHaveBeenCalledTimes(1);
      expect(esClient.update).toHaveBeenCalledWith({
        index: indexName,
        id: insightId,
        body: { doc: insight },
        refresh: 'wait_for',
      });
    });
  });

  describe('fetch', () => {
    it('should fetch the docs with the correct params', async () => {
      const isInitializedSpy = jest
        .spyOn(securityWorkflowInsightsService, 'isInitialized', 'get')
        .mockResolvedValueOnce([undefined, undefined]);

      await securityWorkflowInsightsService.start({ esClient });
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
      await securityWorkflowInsightsService.fetch(searchParams);

      // ensure it waits for initialization first
      expect(isInitializedSpy).toHaveBeenCalledTimes(1);
      // fetches the doc
      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(esClient.search).toHaveBeenCalledWith({
        index: DATA_STREAM_NAME,
        body: {
          query: {
            bool: {
              must: [
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
              ],
            },
          },
          size: searchParams.size,
          from: searchParams.from,
        },
      });
    });
  });
});
