/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum MlModelDeploymentState {
  NotDeployed = '',
  Downloading = 'downloading',
  Downloaded = 'fully_downloaded',
  Starting = 'starting',
  Started = 'started',
  FullyAllocated = 'fully_allocated',
}

export interface MlModelDeploymentStatus {
  deploymentState: MlModelDeploymentState;
  modelId: string;
  nodeAllocationCount: number;
  startTime: number;
  targetAllocationCount: number;
  threadsPerAllocation: number;
}

export interface MlModel {
  modelId: string;
  /** Model inference type, e.g. ner, text_classification */
  type: string;
  /** Type-related tags: model type (e.g. pytorch), inference type, built-in tag */
  types: string[];
  /** Field names in inference input configuration */
  inputFieldNames: string[];
  title: string;
  description?: string;
  licenseType?: string;
  licensePageUrl?: string;
  modelDetailsPageUrl?: string;
  deploymentState: MlModelDeploymentState;
  deploymentStateReason?: string;
  startTime: number;
  targetAllocationCount: number;
  nodeAllocationCount: number;
  threadsPerAllocation: number;
  /** Is this model one of the promoted ones (e.g. ELSER, E5)? */
  isPromoted?: boolean;
  /** Does this model object act as a placeholder before installing the model? */
  isPlaceholder: boolean;
  /** Does this model have deployment stats? */
  hasStats: boolean;
  version?: string;
}
