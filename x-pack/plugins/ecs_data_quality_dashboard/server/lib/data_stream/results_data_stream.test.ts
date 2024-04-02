/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResultsDataStream } from './results_data_stream';
import { Subject } from 'rxjs';
import type { InstallParams } from '@kbn/data-stream-adapter';
import { DataStreamSpacesAdapter } from '@kbn/data-stream-adapter';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';

jest.mock('@kbn/data-stream-adapter');

const MockedDataStreamSpacesAdapter = DataStreamSpacesAdapter as unknown as jest.MockedClass<
  typeof DataStreamSpacesAdapter
>;

const esClient = elasticsearchServiceMock.createStart().client.asInternalUser;

describe('ResultsDataStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create DataStreamSpacesAdapter', () => {
      new ResultsDataStream({ kibanaVersion: '8.13.0' });
      expect(MockedDataStreamSpacesAdapter).toHaveBeenCalledTimes(1);
    });

    it('should create component templates', () => {
      new ResultsDataStream({ kibanaVersion: '8.13.0' });
      const [dataStreamSpacesAdapter] = MockedDataStreamSpacesAdapter.mock.instances;
      expect(dataStreamSpacesAdapter.setComponentTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: '.kibana-data-quality-dashboard-ecs-mappings' })
      );
      expect(dataStreamSpacesAdapter.setComponentTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: '.kibana-data-quality-dashboard-results-mappings' })
      );
    });

    it('should create index templates', () => {
      new ResultsDataStream({ kibanaVersion: '8.13.0' });
      const [dataStreamSpacesAdapter] = MockedDataStreamSpacesAdapter.mock.instances;
      expect(dataStreamSpacesAdapter.setIndexTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: '.kibana-data-quality-dashboard-results-index-template' })
      );
    });
  });

  describe('install', () => {
    it('should install data stream', async () => {
      const resultsDataStream = new ResultsDataStream({ kibanaVersion: '8.13.0' });
      const params: InstallParams = {
        esClient,
        logger: loggerMock.create(),
        pluginStop$: new Subject(),
      };
      await resultsDataStream.install(params);
      const [dataStreamSpacesAdapter] = MockedDataStreamSpacesAdapter.mock.instances;
      expect(dataStreamSpacesAdapter.install).toHaveBeenCalledWith(params);
    });

    it('should log error', async () => {
      const resultsDataStream = new ResultsDataStream({ kibanaVersion: '8.13.0' });
      const params: InstallParams = {
        esClient,
        logger: loggerMock.create(),
        pluginStop$: new Subject(),
      };
      const [dataStreamSpacesAdapter] = MockedDataStreamSpacesAdapter.mock.instances;
      const error = new Error('test-error');
      (dataStreamSpacesAdapter.install as jest.Mock).mockRejectedValueOnce(error);

      await resultsDataStream.install(params);
      expect(params.logger.error).toHaveBeenCalledWith(expect.any(String), error);
    });
  });

  describe('installSpace', () => {
    it('should install space', async () => {
      const resultsDataStream = new ResultsDataStream({ kibanaVersion: '8.13.0' });
      const params: InstallParams = {
        esClient,
        logger: loggerMock.create(),
        pluginStop$: new Subject(),
      };
      const [dataStreamSpacesAdapter] = MockedDataStreamSpacesAdapter.mock.instances;
      (dataStreamSpacesAdapter.install as jest.Mock).mockResolvedValueOnce(undefined);

      await resultsDataStream.install(params);
      await resultsDataStream.installSpace('space1');

      expect(dataStreamSpacesAdapter.getInstalledSpaceName).toHaveBeenCalledWith('space1');
      expect(dataStreamSpacesAdapter.installSpace).toHaveBeenCalledWith('space1');
    });

    it('should not install space if install not executed', async () => {
      const resultsDataStream = new ResultsDataStream({ kibanaVersion: '8.13.0' });
      expect(resultsDataStream.installSpace('space1')).rejects.toThrowError();
    });

    it('should throw error if main install had error', async () => {
      const resultsDataStream = new ResultsDataStream({ kibanaVersion: '8.13.0' });
      const params: InstallParams = {
        esClient,
        logger: loggerMock.create(),
        pluginStop$: new Subject(),
      };
      const [dataStreamSpacesAdapter] = MockedDataStreamSpacesAdapter.mock.instances;
      const error = new Error('test-error');
      (dataStreamSpacesAdapter.install as jest.Mock).mockRejectedValueOnce(error);
      await resultsDataStream.install(params);

      expect(resultsDataStream.installSpace('space1')).rejects.toThrowError(error);
    });
  });
});
