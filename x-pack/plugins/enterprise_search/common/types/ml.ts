/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlTrainedModelConfig } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

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
}

// TODO - we can remove this extension once the new types are available
// in kibana that includes this field
export interface MlTrainedModelConfigWithDefined extends MlTrainedModelConfig {
  fully_defined?: boolean;
}
