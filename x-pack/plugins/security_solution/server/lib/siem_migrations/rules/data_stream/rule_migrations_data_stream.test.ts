/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleMigrationsDataStream } from './rule_migrations_data_stream';
import { Subject } from 'rxjs';
import type { InstallParams } from '@kbn/data-stream-adapter';
import { DataStreamSpacesAdapter } from '@kbn/data-stream-adapter';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { securityServiceMock } from '@kbn/core-security-server-mocks';

jest.mock('@kbn/data-stream-adapter');

// This mock is required to have a way to await the data stream name promise
const mockDataStreamNamePromise = jest.fn();
jest.mock('./rule_migrations_data_client', () => ({
  RuleMigrationsDataClient: jest.fn((dataStreamNamePromise: Promise<string>) => {
    mockDataStreamNamePromise.mockReturnValue(dataStreamNamePromise);
  }),
}));

const MockedDataStreamSpacesAdapter = DataStreamSpacesAdapter as unknown as jest.MockedClass<
  typeof DataStreamSpacesAdapter
>;

const esClient = elasticsearchServiceMock.createStart().client.asInternalUser;

describe('SiemRuleMigrationsDataStream', () => {
  const kibanaVersion = '8.16.0';
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create DataStreamSpacesAdapter', () => {
      new RuleMigrationsDataStream(logger, kibanaVersion);
      expect(MockedDataStreamSpacesAdapter).toHaveBeenCalledTimes(1);
    });

    it('should create component templates', () => {
      new RuleMigrationsDataStream(logger, kibanaVersion);
      const [dataStreamSpacesAdapter] = MockedDataStreamSpacesAdapter.mock.instances;
      expect(dataStreamSpacesAdapter.setComponentTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: '.kibana.siem-rule-migrations' })
      );
    });

    it('should create index templates', () => {
      new RuleMigrationsDataStream(logger, kibanaVersion);
      const [dataStreamSpacesAdapter] = MockedDataStreamSpacesAdapter.mock.instances;
      expect(dataStreamSpacesAdapter.setIndexTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: '.kibana.siem-rule-migrations' })
      );
    });
  });

  describe('install', () => {
    it('should install data stream', async () => {
      const dataStream = new RuleMigrationsDataStream(logger, kibanaVersion);
      const params: Omit<InstallParams, 'logger'> = {
        esClient,
        pluginStop$: new Subject(),
      };
      await dataStream.install(params);
      const [dataStreamSpacesAdapter] = MockedDataStreamSpacesAdapter.mock.instances;
      expect(dataStreamSpacesAdapter.install).toHaveBeenCalledWith(expect.objectContaining(params));
    });

    it('should log error', async () => {
      const dataStream = new RuleMigrationsDataStream(logger, kibanaVersion);
      const params: Omit<InstallParams, 'logger'> = {
        esClient,
        pluginStop$: new Subject(),
      };
      const [dataStreamSpacesAdapter] = MockedDataStreamSpacesAdapter.mock.instances;
      const error = new Error('test-error');
      (dataStreamSpacesAdapter.install as jest.Mock).mockRejectedValueOnce(error);

      await dataStream.install(params);
      expect(logger.error).toHaveBeenCalledWith(expect.any(String), error);
    });
  });

  describe('createClient', () => {
    const currentUser = securityServiceMock.createMockAuthenticatedUser();
    const createClientParams = { spaceId: 'space1', currentUser, esClient };

    it('should install space data stream', async () => {
      const dataStream = new RuleMigrationsDataStream(logger, kibanaVersion);
      const params: InstallParams = {
        esClient,
        logger: loggerMock.create(),
        pluginStop$: new Subject(),
      };
      const [dataStreamSpacesAdapter] = MockedDataStreamSpacesAdapter.mock.instances;
      (dataStreamSpacesAdapter.install as jest.Mock).mockResolvedValueOnce(undefined);

      await dataStream.install(params);
      dataStream.createClient(createClientParams);
      await mockDataStreamNamePromise();

      expect(dataStreamSpacesAdapter.getInstalledSpaceName).toHaveBeenCalledWith('space1');
      expect(dataStreamSpacesAdapter.installSpace).toHaveBeenCalledWith('space1');
    });

    it('should not install space data stream if install not executed', async () => {
      const dataStream = new RuleMigrationsDataStream(logger, kibanaVersion);
      await expect(async () => {
        dataStream.createClient(createClientParams);
        await mockDataStreamNamePromise();
      }).rejects.toThrowError();
    });

    it('should throw error if main install had error', async () => {
      const dataStream = new RuleMigrationsDataStream(logger, kibanaVersion);
      const params: InstallParams = {
        esClient,
        logger: loggerMock.create(),
        pluginStop$: new Subject(),
      };
      const [dataStreamSpacesAdapter] = MockedDataStreamSpacesAdapter.mock.instances;
      const error = new Error('test-error');
      (dataStreamSpacesAdapter.install as jest.Mock).mockRejectedValueOnce(error);
      await dataStream.install(params);

      await expect(async () => {
        dataStream.createClient(createClientParams);
        await mockDataStreamNamePromise();
      }).rejects.toThrowError(error);
    });
  });
});
