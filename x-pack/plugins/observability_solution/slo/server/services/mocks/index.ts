/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { BurnRatesClient } from '..';
import { ResourceInstaller } from '../resource_installer';
import { SLORepository } from '../slo_repository';
import { SummaryClient } from '../summary_client';
import { SummarySearchClient } from '../summary_search_client';
import { TransformManager } from '../transform_manager';

const createResourceInstallerMock = (): jest.Mocked<ResourceInstaller> => {
  return {
    ensureCommonResourcesInstalled: jest.fn(),
  };
};

const createTransformManagerMock = (): jest.Mocked<TransformManager> => {
  return {
    install: jest.fn(),
    preview: jest.fn(),
    uninstall: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    inspect: jest.fn(),
  };
};

const createSummaryTransformManagerMock = (): jest.Mocked<TransformManager> => {
  return {
    install: jest.fn(),
    preview: jest.fn(),
    uninstall: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    inspect: jest.fn(),
  };
};

const createSLORepositoryMock = (): jest.Mocked<SLORepository> => {
  return {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    findAllByIds: jest.fn(),
    deleteById: jest.fn(),
    search: jest.fn(),
    checkIfSLOExists: jest.fn(),
  };
};

const createSummaryClientMock = (): jest.Mocked<SummaryClient> => {
  return {
    computeSummary: jest.fn(),
  };
};

const createSummarySearchClientMock = (): jest.Mocked<SummarySearchClient> => {
  return {
    search: jest.fn(),
  };
};

const createBurnRatesClientMock = (): jest.Mocked<BurnRatesClient> => {
  return {
    calculate: jest.fn(),
  };
};

const createSloContextMock = () => {
  return {
    soClient: {} as any,
    basePath: httpServiceMock.createStartContract().basePath,
    esClient: elasticsearchServiceMock.createElasticsearchClient(),
    logger: loggerMock.create(),
    spaceId: 'some-space',
    rulesClient: rulesClientMock.create(),
    repository: createSLORepositoryMock(),
    scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
    dataViewsService: {} as any,
    burnRatesClient: createBurnRatesClientMock(),
  };
};

export type SLOContextMock = ReturnType<typeof createSloContextMock>;

export {
  createResourceInstallerMock,
  createTransformManagerMock,
  createSummaryTransformManagerMock,
  createSLORepositoryMock,
  createSummaryClientMock,
  createSummarySearchClientMock,
  createBurnRatesClientMock,
  createSloContextMock,
};
