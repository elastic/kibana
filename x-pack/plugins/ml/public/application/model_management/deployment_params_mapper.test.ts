/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlTrainedModelAssignmentTaskParametersAdaptive } from './deployment_params_mapper';
import { DeploymentParamsMapper } from './deployment_params_mapper';
import type { CloudInfo } from '../services/ml_server_info';
import type { MlServerLimits } from '../../../common/types/ml_server_info';

describe('DeploymentParamsMapper', () => {
  const modelId = 'test-model';

  const mlServerLimits: MlServerLimits = {
    max_single_ml_node_processors: 10,
    total_ml_processors: 10,
  };

  const cloudInfo = {
    isMlAutoscalingEnabled: false,
  } as CloudInfo;

  let mapper: DeploymentParamsMapper;

  mapper = new DeploymentParamsMapper(modelId, mlServerLimits, cloudInfo, true);

  describe('DeploymentParamsMapper', () => {
    describe('running in serverless', () => {
      beforeEach(() => {
        mapper = new DeploymentParamsMapper(
          modelId,
          {
            max_single_ml_node_processors: 16,
            total_ml_processors: 32,
          },
          {
            isMlAutoscalingEnabled: false,
          } as CloudInfo,
          false
        );
      });

      it('should enforce adaptive allocations', () => {
        expect(
          mapper.mapUiToUiDeploymentParams({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'low',
          })
        ).toEqual({
          adaptive_allocations: {
            enabled: true,
            max_number_of_allocations: 1,
            min_number_of_allocations: 1,
          },
          deployment_id: 'test-deployment',
          model_id: 'test-model',
          priority: 'low',
          threads_per_allocation: 2,
        });

        expect(
          mapper.mapUiToUiDeploymentParams({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: false,
            vCPUUsage: 'low',
          })
        ).toEqual({
          adaptive_allocations: {
            enabled: true,
            max_number_of_allocations: 2,
            min_number_of_allocations: 1,
          },
          deployment_id: 'test-deployment',
          model_id: 'test-model',
          priority: 'low',
          threads_per_allocation: 1,
        });
      });
    });

    describe('32 cores, 16 single', () => {
      beforeEach(() => {
        mapper = new DeploymentParamsMapper(
          modelId,
          {
            max_single_ml_node_processors: 16,
            total_ml_processors: 32,
          },
          {
            isMlAutoscalingEnabled: false,
          } as CloudInfo,
          true
        );
      });

      it('should provide vCPU level', () => {
        expect(mapper.getVCPURange('low')).toEqual({ min: 1, max: 2 });
        expect(mapper.getVCPURange('medium')).toEqual({ min: 3, max: 16 });
        expect(mapper.getVCPURange('high')).toEqual({ min: 17, max: 32 });
      });
    });

    describe('when autoscaling is disabled', () => {
      beforeEach(() => {
        mapper = new DeploymentParamsMapper(
          modelId,
          mlServerLimits,
          {
            isMlAutoscalingEnabled: false,
          } as CloudInfo,
          true
        );
      });

      it('should map UI params to API request correctly', () => {
        expect(
          mapper.mapUiToUiDeploymentParams({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'low',
          })
        ).toEqual({
          model_id: modelId,
          deployment_id: 'test-deployment',
          priority: 'low',
          threads_per_allocation: 2,
          number_of_allocations: 1,
        });

        expect(
          mapper.mapUiToUiDeploymentParams({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'medium',
          })
        ).toEqual({
          model_id: modelId,
          deployment_id: 'test-deployment',
          priority: 'normal',
          threads_per_allocation: 8,
          number_of_allocations: 1,
        });

        expect(
          mapper.mapUiToUiDeploymentParams({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'high',
          })
        ).toEqual({
          model_id: modelId,
          deployment_id: 'test-deployment',
          priority: 'normal',
          threads_per_allocation: 8,
          number_of_allocations: 1,
        });

        expect(
          mapper.mapUiToUiDeploymentParams({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: false,
            vCPUUsage: 'low',
          })
        ).toEqual({
          model_id: modelId,
          deployment_id: 'test-deployment',
          priority: 'low',
          threads_per_allocation: 1,
          number_of_allocations: 2,
        });

        expect(
          mapper.mapUiToUiDeploymentParams({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: false,
            vCPUUsage: 'medium',
          })
        ).toEqual({
          model_id: modelId,
          deployment_id: 'test-deployment',
          priority: 'normal',
          threads_per_allocation: 1,
          number_of_allocations: 5,
        });

        expect(
          mapper.mapUiToUiDeploymentParams({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: false,
            vCPUUsage: 'high',
          })
        ).toEqual({
          model_id: modelId,
          deployment_id: 'test-deployment',
          priority: 'normal',
          threads_per_allocation: 1,
          number_of_allocations: 10,
        });
      });

      it('should map UI params to API request correctly with adaptive resources', () => {
        expect(
          mapper.mapUiToUiDeploymentParams({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: true,
            vCPUUsage: 'low',
          })
        ).toEqual({
          model_id: modelId,
          deployment_id: 'test-deployment',
          priority: 'low',
          threads_per_allocation: 2,
          adaptive_allocations: {
            enabled: true,
            min_number_of_allocations: 1,
            max_number_of_allocations: 1,
          },
        });

        expect(
          mapper.mapUiToUiDeploymentParams({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: true,
            vCPUUsage: 'medium',
          })
        ).toEqual({
          model_id: modelId,
          deployment_id: 'test-deployment',
          priority: 'normal',
          threads_per_allocation: 8,
          adaptive_allocations: {
            enabled: true,
            min_number_of_allocations: 1,
            max_number_of_allocations: 1,
          },
        });

        expect(
          mapper.mapUiToUiDeploymentParams({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: true,
            vCPUUsage: 'high',
          })
        ).toEqual({
          model_id: modelId,
          deployment_id: 'test-deployment',
          priority: 'normal',
          threads_per_allocation: 8,
          adaptive_allocations: {
            enabled: true,
            min_number_of_allocations: 1,
            max_number_of_allocations: 1,
          },
        });
      });

      describe('mapApiToUiDeploymentParams', () => {
        it('should map API params to UI correctly', () => {
          const input = {
            model_id: modelId,
            deployment_id: 'test-deployment',
            priority: 'normal',
            threads_per_allocation: 8,
            number_of_allocations: 2,
          } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive;
          expect(mapper.mapApiToUiDeploymentParams(input)).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'high',
          });

          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 1,
              number_of_allocations: 1,
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: false,
            vCPUUsage: 'low',
          });

          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 2,
              number_of_allocations: 2,
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'medium',
          });
        });

        it('should map API params to UI correctly with adaptive resources', () => {
          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 8,
              adaptive_allocations: {
                enabled: true,
                min_number_of_allocations: 2,
                max_number_of_allocations: 2,
              },
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: true,
            vCPUUsage: 'high',
          });

          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'normal',
              threads_per_allocation: 2,
              adaptive_allocations: {
                enabled: true,
                min_number_of_allocations: 2,
                max_number_of_allocations: 2,
              },
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: true,
            vCPUUsage: 'medium',
          });

          expect(
            mapper.mapApiToUiDeploymentParams({
              model_id: modelId,
              deployment_id: 'test-deployment',
              priority: 'low',
              threads_per_allocation: 1,
              adaptive_allocations: {
                enabled: true,
                min_number_of_allocations: 1,
                max_number_of_allocations: 1,
              },
            } as unknown as MlTrainedModelAssignmentTaskParametersAdaptive)
          ).toEqual({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: true,
            vCPUUsage: 'low',
          });
        });
      });
    });

    describe('when autoscaling is enabled', () => {
      beforeEach(() => {
        mapper = new DeploymentParamsMapper(
          modelId,
          mlServerLimits,
          {
            isMlAutoscalingEnabled: true,
          } as CloudInfo,
          true
        );
      });

      it('should map UI params to API request correctly', () => {
        expect(
          mapper.mapUiToUiDeploymentParams({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'low',
          })
        ).toEqual({
          model_id: modelId,
          deployment_id: 'test-deployment',
          priority: 'low',
          threads_per_allocation: 2,
          number_of_allocations: 1,
        });

        expect(
          mapper.mapUiToUiDeploymentParams({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'medium',
          })
        ).toEqual({
          model_id: modelId,
          deployment_id: 'test-deployment',
          priority: 'normal',
          threads_per_allocation: 8,
          number_of_allocations: 4,
        });

        expect(
          mapper.mapUiToUiDeploymentParams({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: false,
            vCPUUsage: 'high',
          })
        ).toEqual({
          model_id: modelId,
          deployment_id: 'test-deployment',
          priority: 'normal',
          threads_per_allocation: 8,
          number_of_allocations: 12499,
        });
      });

      it('should map UI params to API request correctly with adaptive resources', () => {
        expect(
          mapper.mapUiToUiDeploymentParams({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: true,
            vCPUUsage: 'low',
          })
        ).toEqual({
          model_id: modelId,
          deployment_id: 'test-deployment',
          priority: 'low',
          threads_per_allocation: 2,
          adaptive_allocations: {
            enabled: true,
            min_number_of_allocations: 1,
            max_number_of_allocations: 1,
          },
        });

        expect(
          mapper.mapUiToUiDeploymentParams({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: true,
            vCPUUsage: 'medium',
          })
        ).toEqual({
          model_id: modelId,
          deployment_id: 'test-deployment',
          priority: 'normal',
          threads_per_allocation: 8,
          adaptive_allocations: {
            enabled: true,
            min_number_of_allocations: 1,
            max_number_of_allocations: 4,
          },
        });

        expect(
          mapper.mapUiToUiDeploymentParams({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForSearch',
            adaptiveResources: true,
            vCPUUsage: 'high',
          })
        ).toEqual({
          model_id: modelId,
          deployment_id: 'test-deployment',
          priority: 'normal',
          threads_per_allocation: 8,
          adaptive_allocations: {
            enabled: true,
            max_number_of_allocations: 12499,
            min_number_of_allocations: 4,
          },
        });

        expect(
          mapper.mapUiToUiDeploymentParams({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: true,
            vCPUUsage: 'low',
          })
        ).toEqual({
          model_id: modelId,
          deployment_id: 'test-deployment',
          priority: 'low',
          threads_per_allocation: 1,
          adaptive_allocations: {
            enabled: true,
            min_number_of_allocations: 1,
            max_number_of_allocations: 2,
          },
        });

        expect(
          mapper.mapUiToUiDeploymentParams({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: true,
            vCPUUsage: 'medium',
          })
        ).toEqual({
          model_id: modelId,
          deployment_id: 'test-deployment',
          priority: 'normal',
          threads_per_allocation: 1,
          adaptive_allocations: {
            enabled: true,
            min_number_of_allocations: 3,
            max_number_of_allocations: 32,
          },
        });

        expect(
          mapper.mapUiToUiDeploymentParams({
            deploymentId: 'test-deployment',
            optimized: 'optimizedForIngest',
            adaptiveResources: true,
            vCPUUsage: 'high',
          })
        ).toEqual({
          model_id: modelId,
          deployment_id: 'test-deployment',
          priority: 'normal',
          threads_per_allocation: 1,
          adaptive_allocations: {
            enabled: true,
            min_number_of_allocations: 33,
            max_number_of_allocations: 99999,
          },
        });
      });
    });
  });
});
