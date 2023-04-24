/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlTrainedModels } from '@kbn/ml-plugin/server';

import { MlModelDeploymentState } from '../../../common/types/ml';
import { ElasticsearchResponseError } from '../../utils/identify_exceptions';

import { getMlModelDeploymentStatus } from './get_ml_model_deployment_status';

describe('getMlModelDeploymentStatus', () => {
  const mockTrainedModelsProvider = {
    getTrainedModels: jest.fn(),
    getTrainedModelsStats: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should error when there is no trained model provider', () => {
    expect(() => getMlModelDeploymentStatus('mockModelName', undefined)).rejects.toThrowError(
      'Machine Learning is not enabled'
    );
  });

  it('should return not deployed status if no model is found', async () => {
    const mockGetReturn = {
      count: 0,
      trained_model_configs: [],
    };

    mockTrainedModelsProvider.getTrainedModels.mockImplementation(() =>
      Promise.resolve(mockGetReturn)
    );

    const deployedStatus = await getMlModelDeploymentStatus(
      'mockModelName',
      mockTrainedModelsProvider as unknown as MlTrainedModels
    );

    expect(deployedStatus.deploymentState).toEqual(MlModelDeploymentState.NotDeployed);
    expect(deployedStatus.modelId).toEqual('mockModelName');
  });

  it('should return not deployed status if no model is found when getTrainedModels has a 404', async () => {
    const mockErrorRejection: ElasticsearchResponseError = {
      meta: {
        body: {
          error: {
            type: 'resource_not_found_exception',
          },
        },
        statusCode: 404,
      },
      name: 'ResponseError',
    };

    mockTrainedModelsProvider.getTrainedModels.mockImplementation(() =>
      Promise.reject(mockErrorRejection)
    );

    const deployedStatus = await getMlModelDeploymentStatus(
      'mockModelName',
      mockTrainedModelsProvider as unknown as MlTrainedModels
    );

    expect(deployedStatus.deploymentState).toEqual(MlModelDeploymentState.NotDeployed);
    expect(deployedStatus.modelId).toEqual('mockModelName');
  });

  it('should return downloading if the model is downloading', async () => {
    const mockGetReturn = {
      count: 1,
      trained_model_configs: [
        {
          fully_defined: false,
          model_id: 'mockModelName',
        },
      ],
    };

    mockTrainedModelsProvider.getTrainedModels.mockImplementation(() =>
      Promise.resolve(mockGetReturn)
    );

    const deployedStatus = await getMlModelDeploymentStatus(
      'mockModelName',
      mockTrainedModelsProvider as unknown as MlTrainedModels
    );

    expect(deployedStatus.deploymentState).toEqual(MlModelDeploymentState.Downloading);
    expect(deployedStatus.modelId).toEqual('mockModelName');
  });

  it('should return downloaded if the model is downloaded but not deployed', async () => {
    const mockGetReturn = {
      count: 1,
      trained_model_configs: [
        {
          fully_defined: true,
          model_id: 'mockModelName',
        },
      ],
    };

    const mockStatsReturn = {
      count: 0,
      trained_model_stats: [],
    };

    mockTrainedModelsProvider.getTrainedModels.mockImplementation(() =>
      Promise.resolve(mockGetReturn)
    );
    mockTrainedModelsProvider.getTrainedModelsStats.mockImplementation(() =>
      Promise.resolve(mockStatsReturn)
    );

    const deployedStatus = await getMlModelDeploymentStatus(
      'mockModelName',
      mockTrainedModelsProvider as unknown as MlTrainedModels
    );

    expect(deployedStatus.deploymentState).toEqual(MlModelDeploymentState.Downloaded);
    expect(deployedStatus.modelId).toEqual('mockModelName');
  });

  it('should return starting if the model is starting deployment', async () => {
    const mockGetReturn = {
      count: 1,
      trained_model_configs: [
        {
          fully_defined: true,
          model_id: 'mockModelName',
        },
      ],
    };

    const mockStatsReturn = {
      count: 1,
      trained_model_stats: [
        {
          deployment_stats: {
            allocation_status: {
              allocation_count: 0,
              state: 'starting',
              target_allocation_count: 3,
            },
            start_time: 123456,
          },
          model_id: 'mockModelName',
        },
      ],
    };

    mockTrainedModelsProvider.getTrainedModels.mockImplementation(() =>
      Promise.resolve(mockGetReturn)
    );
    mockTrainedModelsProvider.getTrainedModelsStats.mockImplementation(() =>
      Promise.resolve(mockStatsReturn)
    );

    const deployedStatus = await getMlModelDeploymentStatus(
      'mockModelName',
      mockTrainedModelsProvider as unknown as MlTrainedModels
    );

    expect(deployedStatus.deploymentState).toEqual(MlModelDeploymentState.Starting);
    expect(deployedStatus.modelId).toEqual('mockModelName');
    expect(deployedStatus.nodeAllocationCount).toEqual(0);
    expect(deployedStatus.startTime).toEqual(123456);
    expect(deployedStatus.targetAllocationCount).toEqual(3);
  });

  it('should return started if the model has been started', async () => {
    const mockGetReturn = {
      count: 1,
      trained_model_configs: [
        {
          fully_defined: true,
          model_id: 'mockModelName',
        },
      ],
    };

    const mockStatsReturn = {
      count: 1,
      trained_model_stats: [
        {
          deployment_stats: {
            allocation_status: {
              allocation_count: 1,
              state: 'started',
              target_allocation_count: 3,
            },
            start_time: 123456,
          },
          model_id: 'mockModelName',
        },
      ],
    };

    mockTrainedModelsProvider.getTrainedModels.mockImplementation(() =>
      Promise.resolve(mockGetReturn)
    );
    mockTrainedModelsProvider.getTrainedModelsStats.mockImplementation(() =>
      Promise.resolve(mockStatsReturn)
    );

    const deployedStatus = await getMlModelDeploymentStatus(
      'mockModelName',
      mockTrainedModelsProvider as unknown as MlTrainedModels
    );

    expect(deployedStatus.deploymentState).toEqual(MlModelDeploymentState.Started);
    expect(deployedStatus.modelId).toEqual('mockModelName');
    expect(deployedStatus.nodeAllocationCount).toEqual(1);
    expect(deployedStatus.startTime).toEqual(123456);
    expect(deployedStatus.targetAllocationCount).toEqual(3);
  });

  it('should return fully allocated if the model is fully allocated', async () => {
    const mockGetReturn = {
      count: 1,
      trained_model_configs: [
        {
          fully_defined: true,
          model_id: 'mockModelName',
        },
      ],
    };

    const mockStatsReturn = {
      count: 1,
      trained_model_stats: [
        {
          deployment_stats: {
            allocation_status: {
              allocation_count: 3,
              state: 'fully_allocated',
              target_allocation_count: 3,
            },
            start_time: 123456,
          },
          model_id: 'mockModelName',
        },
      ],
    };

    mockTrainedModelsProvider.getTrainedModels.mockImplementation(() =>
      Promise.resolve(mockGetReturn)
    );
    mockTrainedModelsProvider.getTrainedModelsStats.mockImplementation(() =>
      Promise.resolve(mockStatsReturn)
    );

    const deployedStatus = await getMlModelDeploymentStatus(
      'mockModelName',
      mockTrainedModelsProvider as unknown as MlTrainedModels
    );

    expect(deployedStatus.deploymentState).toEqual(MlModelDeploymentState.FullyAllocated);
    expect(deployedStatus.modelId).toEqual('mockModelName');
    expect(deployedStatus.nodeAllocationCount).toEqual(3);
    expect(deployedStatus.startTime).toEqual(123456);
    expect(deployedStatus.targetAllocationCount).toEqual(3);
  });
});
