/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@kbn/ml-plugin/server/saved_objects', () => ({
  syncSavedObjectsFactory: jest.fn(),
}));

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { SyncSavedObjectResponse } from '@kbn/ml-plugin/common/types/saved_objects';
import { MlTrainedModels } from '@kbn/ml-plugin/server';
import { MlClient } from '@kbn/ml-plugin/server/lib/ml_client/types';
import * as mockMLSavedObjectService from '@kbn/ml-plugin/server/saved_objects';

import { MlModelDeploymentState } from '../../../common/types/ml';

import { ElasticsearchResponseError } from '../../utils/identify_exceptions';

import * as mockGetStatus from './get_ml_model_deployment_status';
import { startMlModelDeployment } from './start_ml_model_deployment';

describe('startMlModelDeployment', () => {
  const knownModelName = '.elser_model_1_SNAPSHOT';
  const mockIScopedClusterClient = {};
  const mockMlClient = {
    putTrainedModel: jest.fn(),
    startTrainedModelDeployment: jest.fn(),
  };
  const mockTrainedModelsProvider = {
    getTrainedModels: jest.fn(),
    getTrainedModelsStats: jest.fn(),
  };

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
        mockMLSavedObjectService as unknown as mockMLSavedObjectService.MLSavedObjectService
      )
    ).rejects.toThrowError('Machine Learning is not enabled');
  });

  it('should return not found if we are using an unknown model name', async () => {
    try {
      await startMlModelDeployment(
        'unknownModelName',
        mockIScopedClusterClient as unknown as IScopedClusterClient,
        mockMlClient as unknown as MlClient,
        mockTrainedModelsProvider as unknown as MlTrainedModels,
        mockMLSavedObjectService as unknown as mockMLSavedObjectService.MLSavedObjectService
      );
    } catch (e) {
      const asResponseError = e as unknown as ElasticsearchResponseError;
      expect(asResponseError.meta?.statusCode).toEqual(404);
      expect(asResponseError.name).toEqual('ResponseError');
    }
  });

  it('should return the deployment state if already deployed or downloading', async () => {
    jest.spyOn(mockGetStatus, 'getMlModelDeploymentStatus').mockReturnValueOnce(
      Promise.resolve({
        deploymentState: MlModelDeploymentState.Starting,
        modelId: knownModelName,
        nodeAllocationCount: 0,
        startTime: 123456,
        targetAllocationCount: 3,
      })
    );

    const response = await startMlModelDeployment(
      knownModelName,
      mockIScopedClusterClient as unknown as IScopedClusterClient,
      mockMlClient as unknown as MlClient,
      mockTrainedModelsProvider as unknown as MlTrainedModels,
      mockMLSavedObjectService as unknown as mockMLSavedObjectService.MLSavedObjectService
    );

    expect(response.deploymentState).toEqual(MlModelDeploymentState.Starting);
  });

  it('should deploy model if it is downloaded', async () => {
    jest
      .spyOn(mockGetStatus, 'getMlModelDeploymentStatus')
      .mockReturnValueOnce(
        Promise.resolve({
          deploymentState: MlModelDeploymentState.Downloaded,
          modelId: knownModelName,
          nodeAllocationCount: 0,
          startTime: 123456,
          targetAllocationCount: 3,
        })
      )
      .mockReturnValueOnce(
        Promise.resolve({
          deploymentState: MlModelDeploymentState.Starting,
          modelId: knownModelName,
          nodeAllocationCount: 0,
          startTime: 123456,
          targetAllocationCount: 3,
        })
      );
    mockMlClient.startTrainedModelDeployment.mockImplementation(async () => {});

    const response = await startMlModelDeployment(
      knownModelName,
      mockIScopedClusterClient as unknown as IScopedClusterClient,
      mockMlClient as unknown as MlClient,
      mockTrainedModelsProvider as unknown as MlTrainedModels,
      mockMLSavedObjectService as unknown as mockMLSavedObjectService.MLSavedObjectService
    );
    expect(response.deploymentState).toEqual(MlModelDeploymentState.Starting);
    expect(mockMlClient.startTrainedModelDeployment).toBeCalledTimes(1);
  });

  it('should start a download and sync if not downloaded yet', async () => {
    jest
      .spyOn(mockGetStatus, 'getMlModelDeploymentStatus')
      .mockReturnValueOnce(
        Promise.resolve({
          deploymentState: MlModelDeploymentState.NotDeployed,
          modelId: knownModelName,
          nodeAllocationCount: 0,
          startTime: 123456,
          targetAllocationCount: 3,
        })
      )
      .mockReturnValueOnce(
        Promise.resolve({
          deploymentState: MlModelDeploymentState.Downloading,
          modelId: knownModelName,
          nodeAllocationCount: 0,
          startTime: 123456,
          targetAllocationCount: 3,
        })
      );

    (mockMLSavedObjectService.syncSavedObjectsFactory as jest.Mock).mockReturnValue({
      syncSavedObjects: async (_simulate: boolean = false) => {
        const results: SyncSavedObjectResponse = {
          datafeedsAdded: {},
          datafeedsRemoved: {},
          savedObjectsCreated: {},
          savedObjectsDeleted: {},
        };
        return results;
      },
    });

    mockMlClient.putTrainedModel.mockImplementation(async () => {});

    const response = await startMlModelDeployment(
      knownModelName,
      mockIScopedClusterClient as unknown as IScopedClusterClient,
      mockMlClient as unknown as MlClient,
      mockTrainedModelsProvider as unknown as MlTrainedModels,
      mockMLSavedObjectService as unknown as mockMLSavedObjectService.MLSavedObjectService
    );
    expect(response.deploymentState).toEqual(MlModelDeploymentState.Downloading);
    expect(mockMlClient.putTrainedModel).toBeCalledTimes(1);
    expect(mockMLSavedObjectService.syncSavedObjectsFactory).toBeCalledTimes(1);
  });
});
