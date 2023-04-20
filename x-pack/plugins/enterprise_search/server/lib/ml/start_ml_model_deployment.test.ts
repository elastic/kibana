/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { MlTrainedModels } from '@kbn/ml-plugin/server';
import { MlClient } from '@kbn/ml-plugin/server/lib/ml_client/types';
import { MLSavedObjectService } from '@kbn/ml-plugin/server/saved_objects';

import { MlModelDeploymentState, MlModelDeploymentStatus } from '../../../common/types/ml';

import * as mockGetStatus from './get_ml_model_deployment_status';
import { startMlModelDeployment } from './start_ml_model_deployment';

describe('startMlModelDeployment', () => {
  const knownModelName = '.elser_model_1_SNAPSHOT';
  const mockIScopedClusterClient = {};
  const mockMlClient = {
    startTrainedModelDeployment: jest.fn(),
    putTrainedModel: jest.fn(),
  };
  const mockTrainedModelsProvider = {
    getTrainedModels: jest.fn(),
    getTrainedModelsStats: jest.fn(),
  };
  const mockSavedObjectService = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should error when there is no trained model provider', () => {
    expect(() =>
      startMlModelDeployment(
        knownModelName,
        mockIScopedClusterClient as unknown as IScopedClusterClient,
        mockMlClient as unknown as MlClient,
        undefined,
        mockSavedObjectService as unknown as MLSavedObjectService
      )
    ).rejects.toThrowError('Machine Learning is not enabled');
  });

  it('should return not found if we are using an unknown model name', async () => {
    expect.assertions(1);
    try {
      await startMlModelDeployment(
        'unknownModelName',
        mockIScopedClusterClient as unknown as IScopedClusterClient,
        mockMlClient as unknown as MlClient,
        mockTrainedModelsProvider as unknown as MlTrainedModels,
        mockSavedObjectService as unknown as MLSavedObjectService
      );
    } catch (e) {
      expect(e.meta.status_code).toEqual(404);
      expect(e.name).toEqual('ResponseError');
    }
  });

  it('should return the deployment state if already deployed or downloading', async () => {
    jest.spyOn(mockGetStatus, 'getMlModelDeploymentStatus').mockReturnValueOnce(
      new Promise<MlModelDeploymentStatus>((resolve) => {
        resolve({
          deploymentState: MlModelDeploymentState.Starting,
          modelId: knownModelName,
          nodeAllocationCount: 0,
          startTime: 123456,
          targetAllocationCount: 3,
        });
      })
    );

    const response = await startMlModelDeployment(
      knownModelName,
      mockIScopedClusterClient as unknown as IScopedClusterClient,
      mockMlClient as unknown as MlClient,
      mockTrainedModelsProvider as unknown as MlTrainedModels,
      mockSavedObjectService as unknown as MLSavedObjectService
    );

    expect(response.deploymentState).toEqual(MlModelDeploymentState.Starting);
  });

  it('should deploy model if it is downloaded', async () => {
    jest
      .spyOn(mockGetStatus, 'getMlModelDeploymentStatus')
      .mockReturnValueOnce(
        new Promise<MlModelDeploymentStatus>((resolve) => {
          resolve({
            deploymentState: MlModelDeploymentState.Downloaded,
            modelId: knownModelName,
            nodeAllocationCount: 0,
            startTime: 123456,
            targetAllocationCount: 3,
          });
        })
      )
      .mockReturnValueOnce(
        new Promise<MlModelDeploymentStatus>((resolve) => {
          resolve({
            deploymentState: MlModelDeploymentState.Starting,
            modelId: knownModelName,
            nodeAllocationCount: 0,
            startTime: 123456,
            targetAllocationCount: 3,
          });
        })
      );
    mockMlClient.startTrainedModelDeployment.mockImplementation(async () => {});

    const response = await startMlModelDeployment(
      knownModelName,
      mockIScopedClusterClient as unknown as IScopedClusterClient,
      mockMlClient as unknown as MlClient,
      mockTrainedModelsProvider as unknown as MlTrainedModels,
      mockSavedObjectService as unknown as MLSavedObjectService
    );
    expect(response.deploymentState).toEqual(MlModelDeploymentState.Starting);
    expect(mockMlClient.startTrainedModelDeployment).toBeCalledTimes(1);
  });
});
