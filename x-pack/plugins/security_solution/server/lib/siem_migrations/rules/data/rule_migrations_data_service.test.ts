/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import type { InstallParams } from '@kbn/index-adapter';
import { IndexPatternAdapter } from '@kbn/index-adapter';
import { loggerMock } from '@kbn/logging-mocks';
import { Subject } from 'rxjs';
import type { IndexNameProviders } from './rule_migrations_data_client';
import { INDEX_PATTERN, RuleMigrationsDataService } from './rule_migrations_data_service';

jest.mock('@kbn/index-adapter');

// This mock is required to have a way to await the index pattern name promise
let mockIndexNameProviders: IndexNameProviders;
jest.mock('./rule_migrations_data_client', () => ({
  RuleMigrationsDataClient: jest.fn((indexNameProviders: IndexNameProviders) => {
    mockIndexNameProviders = indexNameProviders;
  }),
}));

const MockedIndexPatternAdapter = IndexPatternAdapter as unknown as jest.MockedClass<
  typeof IndexPatternAdapter
>;

const esClient = elasticsearchServiceMock.createStart().client.asInternalUser;

describe('SiemRuleMigrationsDataService', () => {
  const kibanaVersion = '8.16.0';
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create IndexPatternAdapters', () => {
      new RuleMigrationsDataService(logger, kibanaVersion);
      expect(MockedIndexPatternAdapter).toHaveBeenCalledTimes(3);
    });

    it('should create component templates', () => {
      new RuleMigrationsDataService(logger, kibanaVersion);
      const [indexPatternAdapter] = MockedIndexPatternAdapter.mock.instances;
      expect(indexPatternAdapter.setComponentTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: `${INDEX_PATTERN}-rules` })
      );
      expect(indexPatternAdapter.setComponentTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: `${INDEX_PATTERN}-resources` })
      );
      expect(indexPatternAdapter.setComponentTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: `${INDEX_PATTERN}-integrations` })
      );
    });

    it('should create index templates', () => {
      new RuleMigrationsDataService(logger, kibanaVersion);
      const [indexPatternAdapter] = MockedIndexPatternAdapter.mock.instances;
      expect(indexPatternAdapter.setIndexTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: `${INDEX_PATTERN}-rules` })
      );
      expect(indexPatternAdapter.setIndexTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: `${INDEX_PATTERN}-resources` })
      );
      expect(indexPatternAdapter.setIndexTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: `${INDEX_PATTERN}-integrations` })
      );
    });
  });

  describe('install', () => {
    it('should install index pattern', async () => {
      const index = new RuleMigrationsDataService(logger, kibanaVersion);
      const params: Omit<InstallParams, 'logger'> = {
        esClient,
        pluginStop$: new Subject(),
      };
      await index.install(params);
      const [indexPatternAdapter] = MockedIndexPatternAdapter.mock.instances;
      expect(indexPatternAdapter.install).toHaveBeenCalledWith(expect.objectContaining(params));
    });
  });

  describe('createClient', () => {
    const currentUser = securityServiceMock.createMockAuthenticatedUser();
    const createClientParams = { spaceId: 'space1', currentUser, esClient };

    it('should install space index pattern', async () => {
      const index = new RuleMigrationsDataService(logger, kibanaVersion);
      const params: InstallParams = {
        esClient,
        logger: loggerMock.create(),
        pluginStop$: new Subject(),
      };
      const [
        rulesIndexPatternAdapter,
        resourcesIndexPatternAdapter,
        integrationsIndexPatternAdapter,
      ] = MockedIndexPatternAdapter.mock.instances;
      (rulesIndexPatternAdapter.install as jest.Mock).mockResolvedValueOnce(undefined);

      await index.install(params);
      index.createClient(createClientParams);

      await mockIndexNameProviders.rules();
      await mockIndexNameProviders.resources();
      await mockIndexNameProviders.integrations();

      expect(rulesIndexPatternAdapter.createIndex).toHaveBeenCalledWith('space1');
      expect(rulesIndexPatternAdapter.getIndexName).toHaveBeenCalledWith('space1');

      expect(resourcesIndexPatternAdapter.createIndex).toHaveBeenCalledWith('space1');
      expect(resourcesIndexPatternAdapter.getIndexName).toHaveBeenCalledWith('space1');

      expect(integrationsIndexPatternAdapter.createIndex).toHaveBeenCalledWith('space1');
      expect(integrationsIndexPatternAdapter.getIndexName).toHaveBeenCalledWith('space1');
    });
  });
});
