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

// TODO set to 0 when https://github.com/elastic/elasticsearch/pull/113455 is merged
const MIN_SUPPORTED_NUMBER_OF_ALLOCATIONS = 1;

type VCPUBreakpoints = Record<
  DeploymentParamsUI['vCPUUsage'],
  {
    min: number;
    max: number;
    /** Static value is used for the number of vCPUs when the adaptive resources are disabled */
    static: number;
  }
>;

type BreakpointValues = VCPUBreakpoints[keyof VCPUBreakpoints];

/**
 * Class responsible for mapping deployment params between API and UI
 */
export class DeploymentParamsMapper {
  private readonly threadingParamsValues: number[];

  /**
   * vCPUs level breakpoints for cloud cluster with enabled ML autoscaling
   */
  private readonly autoscalingVCPUBreakpoints: VCPUBreakpoints = {
    low: { min: MIN_SUPPORTED_NUMBER_OF_ALLOCATIONS, max: 2, static: 2 },
    medium: { min: 3, max: 32, static: 32 },
    high: { min: 33, max: 99999, static: 100 },
  };

  /**
   * vCPUs level breakpoints for serverless projects
   */
  private readonly serverlessVCPUBreakpoints: VCPUBreakpoints = {
    low: { min: MIN_SUPPORTED_NUMBER_OF_ALLOCATIONS, max: 2, static: 2 },
    medium: { min: 3, max: 32, static: 32 },
    high: { min: 33, max: 500, static: 100 },
  };

  /**
   * vCPUs level breakpoints based on the ML server limits.
   * Either on-prem or cloud with disabled ML autoscaling
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
      low: { min: MIN_SUPPORTED_NUMBER_OF_ALLOCATIONS, max: 2, static: 2 },
      medium: { min: Math.min(3, mediumValue), max: mediumValue, static: mediumValue },
      high: {
        min: mediumValue + 1,
        max: this.mlServerLimits!.total_ml_processors!,
        static: this.mlServerLimits!.total_ml_processors!,
      },
    };

    if (!this.showNodeInfo) {
      this.vCpuBreakpoints = this.serverlessVCPUBreakpoints;
    } else if (this.cloudInfo.isMlAutoscalingEnabled) {
      this.vCpuBreakpoints = this.autoscalingVCPUBreakpoints;
    } else {
      this.vCpuBreakpoints = this.hardwareVCPUBreakpoints;
    }
  }

  private getNumberOfThreads(input: DeploymentParamsUI): number {
    // 1 thread for ingest at all times
    if (input.optimized === 'optimizedForIngest') return 1;
    // for search deployments with low vCPUs level set 2, otherwise max available
    return input.vCPUUsage === 'low' ? 2 : Math.max(...this.threadingParamsValues);
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
      min_number_of_allocations:
        Math.floor(levelValues.min / threadsPerAllocation) ||
        // in any env, allow scale down to 0 only for "low" vCPU usage
        (params.vCPUUsage === 'low' ? MIN_SUPPORTED_NUMBER_OF_ALLOCATIONS : 1),
      max_number_of_allocations: maxValue,
    };
  }

  /**
   * Gets vCPU (virtual CPU) range based on the vCPU usage level
   * @param vCPUUsage
   * @returns
   */
  public getVCPURange(vCPUUsage: DeploymentParamsUI['vCPUUsage']) {
    return this.vCpuBreakpoints[vCPUUsage];
  }

  /**
   * Gets VCU (Virtual Compute Units) range based on the vCPU usage level
   * @param vCPUUsage
   * @returns
   */
  public getVCURange(vCPUUsage: DeploymentParamsUI['vCPUUsage']) {
    // general purpose (c6gd) 1VCU = 1GB RAM / 0.5 vCPU
    // vector optimized (r6gd) 1VCU = 1GB RAM / 0.125 vCPU
    const vCPUBreakpoints = this.serverlessVCPUBreakpoints[vCPUUsage];

    return Object.entries(vCPUBreakpoints).reduce((acc, [key, val]) => {
      // as we can't retrieve Search project configuration, we assume that the vector optimized instance is used
      acc[key as keyof BreakpointValues] = Math.round(val / 0.125);
      return acc;
    }, {} as BreakpointValues);
  }

  /**
   * Maps UI params to the actual start deployment API request
   * @param input
   */
  public mapUiToApiDeploymentParams(
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
      priority: 'normal',
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
