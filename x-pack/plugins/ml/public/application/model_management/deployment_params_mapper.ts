/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MlStartTrainedModelDeploymentRequest,
  MlTrainedModelAssignmentTaskParameters,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { CloudInfo } from '../services/ml_server_info';
import type { MlServerLimits } from '../../../common/types/ml_server_info';
import type { AdaptiveAllocations } from '../../../server/lib/ml_client/types';
import type { DeploymentParamsUI } from './deployment_setup';

export type MlStartTrainedModelDeploymentRequestNew = MlStartTrainedModelDeploymentRequest &
  AdaptiveAllocations;

/**
 * Default value of max allocation.
 * Used an upper limit for a medium vCPU level.
 */
const DEFAULT_MAX_ALLOCATIONS = 32;

const THREADS_MAX_EXPONENT = 5;

type VCPUBreakpoints = Record<DeploymentParamsUI['vCPUUsage'], { min: number; max: number }>;
/**
 * Class responsible for mapping deployment params between API and UI
 */
export class DeploymentParamsMapper {
  private readonly threadingParamsValues: number[];

  private readonly autoscalingVCPUBreakpoints: VCPUBreakpoints = {
    low: { min: 1, max: 1 },
    medium: { min: 2, max: 32 },
    high: { min: 32, max: 99999 },
  };

  private readonly hardwareVCPUBreakpoints: VCPUBreakpoints;

  private readonly vCpuBreakpoints: VCPUBreakpoints;

  constructor(
    private readonly modelId: string,
    private readonly mlServerLimits: MlServerLimits,
    private readonly cloudInfo: CloudInfo
  ) {
    const maxSingleMlNodeProcessors = this.mlServerLimits.max_single_ml_node_processors;

    this.threadingParamsValues = new Array(THREADS_MAX_EXPONENT)
      .fill(null)
      .map((v, i) => Math.pow(2, i))
      .filter(maxSingleMlNodeProcessors ? (v) => v <= maxSingleMlNodeProcessors : (v) => true);

    const mediumValue = this.mlServerLimits!.total_ml_processors! / 2;

    this.hardwareVCPUBreakpoints = {
      low: { min: 1, max: 1 },
      medium: { min: Math.min(2, mediumValue), max: mediumValue },
      high: {
        min: mediumValue,
        max: this.mlServerLimits!.total_ml_processors!,
      },
    };

    this.vCpuBreakpoints = this.cloudInfo.isMlAutoscalingEnabled
      ? this.autoscalingVCPUBreakpoints
      : this.hardwareVCPUBreakpoints;
  }

  private getNumberOfThread(input: DeploymentParamsUI): number {
    if (input.vCPUUsage === 'low') return 1;
    return input.optimized === 'optimizedForIngest' ? 1 : Math.max(...this.threadingParamsValues);
  }

  private getAllocationsParams(
    params: DeploymentParamsUI
  ): Pick<MlStartTrainedModelDeploymentRequestNew, 'number_of_allocations'> &
    Pick<
      Exclude<MlStartTrainedModelDeploymentRequestNew['adaptive_allocations'], undefined>,
      'min_number_of_allocations' | 'max_number_of_allocations'
    > {
    const threadsPerAllocation = this.getNumberOfThread(params);

    const mediumValue = this.cloudInfo.isMlAutoscalingEnabled
      ? DEFAULT_MAX_ALLOCATIONS
      : Math.ceil(
          Math.min(
            DEFAULT_MAX_ALLOCATIONS,
            (this.mlServerLimits.total_ml_processors ?? DEFAULT_MAX_ALLOCATIONS) /
              threadsPerAllocation /
              2
          )
        );

    const highValue = this.cloudInfo.isMlAutoscalingEnabled
      ? 999999
      : Math.floor(
          (this.mlServerLimits.total_ml_processors ?? DEFAULT_MAX_ALLOCATIONS) /
            threadsPerAllocation
        );

    switch (params.vCPUUsage) {
      case 'low':
        return {
          number_of_allocations: 1,
          min_number_of_allocations: 1,
          max_number_of_allocations: 2,
        };
      case 'medium':
        return {
          number_of_allocations: mediumValue,
          min_number_of_allocations: Math.min(2, mediumValue),
          max_number_of_allocations: mediumValue,
        };
      case 'high':
        return {
          number_of_allocations: highValue,
          min_number_of_allocations: mediumValue,
          max_number_of_allocations: highValue,
        };
    }
  }

  /**
   * Maps UI params to the actual start deployment API request
   * @param input
   */
  public mapUiToUiDeploymentParams(
    input: DeploymentParamsUI
  ): MlStartTrainedModelDeploymentRequestNew {
    const allocationParams = this.getAllocationsParams(input);

    return {
      model_id: this.modelId,
      deployment_id: input.deploymentId,
      priority: input.vCPUUsage === 'low' ? 'low' : 'normal',
      threads_per_allocation: this.getNumberOfThread(input),
      ...(input.adaptiveResources
        ? {
            adaptive_allocations: {
              enabled: true,
              min_number_of_allocations: allocationParams.min_number_of_allocations,
              max_number_of_allocations: allocationParams.max_number_of_allocations,
            },
          }
        : {
            number_of_allocations: allocationParams.number_of_allocations,
          }),
    };
  }

  /**
   * Maps deployment params from API to the UI
   * @param input
   */
  public mapApiToUiDeploymentParams(
    input: MlTrainedModelAssignmentTaskParametersAdaptive
  ): DeploymentParamsUI {
    let optimized: DeploymentParamsUI['optimized'] = 'optimizedForIngest';
    if (input.threads_per_allocation > 1) {
      optimized = 'optimizedForSearch';
    }
    const adaptiveResources = !!input.adaptive_allocations?.enabled;

    const vCPUs =
      input.threads_per_allocation *
      (adaptiveResources
        ? input.adaptive_allocations!.max_number_of_allocations!
        : input.number_of_allocations);

    const [vCPUUsage] = Object.entries(this.vCpuBreakpoints)
      .reverse()
      .find(([key, val]) => vCPUs >= val.min) as [
      DeploymentParamsUI['vCPUUsage'],
      { min: number; max: number }
    ];

    return {
      deploymentId: input.deployment_id,
      optimized,
      adaptiveResources,
      vCPUUsage,
    };
  }
}

export type MlTrainedModelAssignmentTaskParametersAdaptive =
  MlTrainedModelAssignmentTaskParameters & AdaptiveAllocations;
