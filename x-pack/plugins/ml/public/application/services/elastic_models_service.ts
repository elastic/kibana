/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ModelDefinitionResponse } from '@kbn/ml-trained-models-utils';
import { type TrainedModelsApiService } from './ml_api_service/trained_models';

export type ElserVersion = 1 | 2;

export class ElasticModels {
  constructor(private readonly trainedModels: TrainedModelsApiService) {}

  /**
   * Provides an ELSER model name and configuration for download based on the current cluster architecture.
   */
  public async getELSER(options?: { version?: ElserVersion }): Promise<ModelDefinitionResponse> {
    const response = await this.trainedModels.getTrainedModelDownloads();

    let requestedModel: ModelDefinitionResponse | undefined;
    let recommendedModel: ModelDefinitionResponse | undefined;
    let defaultModel: ModelDefinitionResponse | undefined;

    for (const model of response) {
      if (options?.version === model.version) {
        requestedModel = model;
        if (model.recommended) {
          requestedModel = model;
        }
      } else if (model.recommended) {
        recommendedModel = model;
      } else if (model.default) {
        defaultModel = model;
      }
    }

    if (!requestedModel && !defaultModel && !recommendedModel) {
      throw new Error('Requested model not found');
    }

    return requestedModel || recommendedModel || defaultModel!;
  }
}
