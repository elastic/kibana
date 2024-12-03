/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { InferenceEndpointManager } from './endpoint_manager';

jest.mock('./utils');
import { installElser, getModelInstallStatus, waitUntilModelDeployed } from './utils';
const installElserMock = installElser as jest.MockedFn<typeof installElser>;
const getModelInstallStatusMock = getModelInstallStatus as jest.MockedFn<
  typeof getModelInstallStatus
>;
const waitUntilModelDeployedMock = waitUntilModelDeployed as jest.MockedFn<
  typeof waitUntilModelDeployed
>;

describe('InferenceEndpointManager', () => {
  let logger: MockedLogger;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let endpointManager: InferenceEndpointManager;

  beforeEach(() => {
    logger = loggerMock.create();
    esClient = elasticsearchServiceMock.createElasticsearchClient();

    endpointManager = new InferenceEndpointManager({ esClient, logger });
  });

  afterEach(() => {
    installElserMock.mockReset();
    getModelInstallStatusMock.mockReset();
    waitUntilModelDeployedMock.mockReset();
  });

  describe('#ensureInternalElserInstalled', () => {
    it('installs ELSER if not already installed', async () => {
      getModelInstallStatusMock.mockResolvedValue({ installed: true });

      await endpointManager.ensureInternalElserInstalled();

      expect(installElserMock).not.toHaveBeenCalled();
      expect(waitUntilModelDeployedMock).toHaveBeenCalledTimes(1);
    });
    it('does not install ELSER if already present', async () => {
      getModelInstallStatusMock.mockResolvedValue({ installed: false });

      await endpointManager.ensureInternalElserInstalled();

      expect(installElserMock).toHaveBeenCalledTimes(1);
      expect(waitUntilModelDeployedMock).toHaveBeenCalledTimes(1);
    });
  });
});
