/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlTrainedModels } from '@kbn/ml-plugin/server';

import { MlModelDeploymentState } from '../../../common/types/ml';

import { ElasticsearchResponseError } from '../../utils/identify_exceptions';

import * as mockGetStatus from './get_ml_model_deployment_status';
import { startMlModelDeployment } from './start_ml_model_deployment';

describe('startMlModelDeployment', () => {
  const knownModelName = '.elser_model_1_SNAPSHOT';
  const mockTrainedModelsProvider = {
    getTrainedModels: jest.fn(),
    getTrainedModelsStats: jest.fn(),
    startTrainedModelDeployment: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should error when there is no trained model provider', () => {
    expect(() => startMlModelDeployment(knownModelName, undefined)).rejects.toThrowError(
      'Machine Learning is not enabled'
    );
  });

  it('should return not found if we are using an unknown model name', async () => {
    try {
      await startMlModelDeployment(
        'unknownModelName',
        mockTrainedModelsProvider as unknown as MlTrainedModels
      );
    } catch (e) {
      const asResponseError = e as unknown as ElasticsearchResponseError;
      expect(asResponseError.meta?.statusCode).toEqual(404);
      expect(asResponseError.name).toEqual('ResponseError');
    }
  });

  it('should return the deployment state if not "downloaded"', async () => {
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
      mockTrainedModelsProvider as unknown as MlTrainedModels
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
    mockTrainedModelsProvider.startTrainedModelDeployment.mockImplementation(async () => {});

    const response = await startMlModelDeployment(
      knownModelName,
      mockTrainedModelsProvider as unknown as MlTrainedModels
    );
    expect(response.deploymentState).toEqual(MlModelDeploymentState.Starting);
    expect(mockTrainedModelsProvider.startTrainedModelDeployment).toBeCalledTimes(1);
  });
});
