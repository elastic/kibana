/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ModelDefinitionResponse,
  GetModelDownloadConfigOptions,
} from '@kbn/ml-trained-models-utils';
import { type TrainedModelsApiService } from './ml_api_service/trained_models';

export class ElasticModels {
  constructor(private readonly trainedModels: TrainedModelsApiService) {}

  /**
   * Provides an ELSER model name and configuration for download based on the current cluster architecture.
   * The current default version is 2. If running on Cloud it returns the Linux x86_64 optimized version.
   * If any of the ML nodes run a different OS rather than Linux, or the CPU architecture isn't x86_64,
   * a portable version of the model is returned.
   */
  public async getELSER(options?: GetModelDownloadConfigOptions): Promise<ModelDefinitionResponse> {
    return await this.trainedModels.getElserConfig(options);
  }
}
