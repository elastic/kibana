/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlStartTrainedModelDeploymentRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { TrainedModelDeploymentStatsResponse } from '../../../common/types/trained_models';
import type { CloudInfo } from '../services/ml_server_info';
import type { MlServerLimits } from '../../../common/types/ml_server_info';
import type { AdaptiveAllocations } from '../../../server/lib/ml_client/types';
import type { DeploymentParamsUI } from './deployment_setup';

export type MlStartTrainedModelDeploymentRequestNew = MlStartTrainedModelDeploymentRequest &
  AdaptiveAllocations;

const THREADS_MAX_EXPONENT = 5;

type VCPUBreakpoints = Record<DeploymentParamsUI['vCPUUsage'], { min: number; max: number }>;
/**
 * Class responsible for mapping deployment params between API and UI
 */
export class DeploymentParamsMapper {
  private readonly threadingParamsValues: number[];

  /**
   * vCPUs level breakpoints for cloud cluster with enabled ML autoscaling
   */
  private readonly autoscalingVCPUBreakpoints: VCPUBreakpoints = {
    low: { min: 1, max: 1 },
    medium: { min: 2, max: 32 },
    high: { min: 32, max: 99999 },
  };

  /**
   * vCPUs level breakpoints based on the ML server limits
   */
  private readonly hardwareVCPUBreakpoints: VCPUBreakpoints;

  /**
   * Result vCPUs level breakpoint based on the cluster env.
   */
  private readonly vCpuBreakpoints: VCPUBreakpoints;

  constructor(
    private readonly modelId: string,
    private readonly mlServerLimits: MlServerLimits,
    private readonly cloudInfo: CloudInfo,
    private readonly showNodeInfo: boolean
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

  private getNumberOfThreads(input: DeploymentParamsUI): number {
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
    const threadsPerAllocation = this.getNumberOfThreads(params);

    const levelValues = this.vCpuBreakpoints[params.vCPUUsage];

    const maxValue = Math.floor(levelValues.max / threadsPerAllocation) || 1;

    return {
      number_of_allocations: maxValue,
      min_number_of_allocations: Math.floor(levelValues.min / threadsPerAllocation) || 1,
      max_number_of_allocations: maxValue,
    };
  }

  public getVCPURange(vCPUUsage: DeploymentParamsUI['vCPUUsage']) {
    return this.vCpuBreakpoints[vCPUUsage];
  }
  /**
   * Maps UI params to the actual start deployment API request
   * @param input
   */
  public mapUiToUiDeploymentParams(
    input: DeploymentParamsUI
  ): MlStartTrainedModelDeploymentRequestNew {
    const resultInput: DeploymentParamsUI = Object.create(input);
    if (!this.showNodeInfo) {
      // Enforce adaptive resources for serverless
      resultInput.adaptiveResources = true;
    }

    const allocationParams = this.getAllocationsParams(resultInput);

    return {
      model_id: this.modelId,
      deployment_id: resultInput.deploymentId,
      priority: resultInput.vCPUUsage === 'low' ? 'low' : 'normal',
      threads_per_allocation: this.getNumberOfThreads(resultInput),
      ...(resultInput.adaptiveResources || !this.showNodeInfo
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

export type MlTrainedModelAssignmentTaskParametersAdaptive = TrainedModelDeploymentStatsResponse &
  AdaptiveAllocations;
