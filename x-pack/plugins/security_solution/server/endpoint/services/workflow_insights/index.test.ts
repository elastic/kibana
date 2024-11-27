/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReplaySubject } from 'rxjs';

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { DataStreamSpacesAdapter } from '@kbn/data-stream-adapter';
import { loggerMock } from '@kbn/logging-mocks';
import { kibanaPackageJson } from '@kbn/repo-info';

import { createDatastream, createPipeline } from './helpers';
import { securityWorkflowInsightsService } from '.';
import { DATA_STREAM_NAME } from './constants';

jest.mock('./helpers', () => ({
  createDatastream: jest.fn(),
  createPipeline: jest.fn(),
}));

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
    it('should wait for initialization', async () => {
      const isInitializedSpy = jest
        .spyOn(securityWorkflowInsightsService, 'isInitialized', 'get')
        .mockResolvedValueOnce([undefined, undefined]);

      await securityWorkflowInsightsService.create();

      expect(isInitializedSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('should wait for initialization', async () => {
      const isInitializedSpy = jest
        .spyOn(securityWorkflowInsightsService, 'isInitialized', 'get')
        .mockResolvedValueOnce([undefined, undefined]);

      await securityWorkflowInsightsService.update();

      expect(isInitializedSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetch', () => {
    it('should wait for initialization', async () => {
      const isInitializedSpy = jest
        .spyOn(securityWorkflowInsightsService, 'isInitialized', 'get')
        .mockResolvedValueOnce([undefined, undefined]);

      await securityWorkflowInsightsService.fetch();

      expect(isInitializedSpy).toHaveBeenCalledTimes(1);
    });
  });
});
