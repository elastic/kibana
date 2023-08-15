/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResourceInstaller } from '../resource_installer';
import { SLIClient } from '../sli_client';
import { SLORepository } from '../slo_repository';
import { SummaryClient } from '../summary_client';
import { SummarySearchClient } from '../summary_search_client';
import { SummaryTransformInstaller } from '../summary_transform/summary_transform_installer';
import { TransformManager } from '../transform_manager';

const createResourceInstallerMock = (): jest.Mocked<ResourceInstaller> => {
  return {
    ensureCommonResourcesInstalled: jest.fn(),
  };
};

const createSummaryTransformInstallerMock = (): jest.Mocked<SummaryTransformInstaller> => {
  return {
    installAndStart: jest.fn(),
  };
};

const createTransformManagerMock = (): jest.Mocked<TransformManager> => {
  return {
    install: jest.fn(),
    uninstall: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };
};

const createSLORepositoryMock = (): jest.Mocked<SLORepository> => {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findAllByIds: jest.fn(),
    deleteById: jest.fn(),
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

const createSLIClientMock = (): jest.Mocked<SLIClient> => {
  return {
    fetchSLIDataFrom: jest.fn(),
  };
};

export {
  createResourceInstallerMock,
  createSummaryTransformInstallerMock,
  createTransformManagerMock,
  createSLORepositoryMock,
  createSummaryClientMock,
  createSummarySearchClientMock,
  createSLIClientMock,
};
