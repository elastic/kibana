/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { trainedModelsApiProvider } from '../../../../../services/ml_api_service/trained_models';
import { DgaInferenceResponse } from '../../../../../services/ml_api_service/trained_models';

// const DEFAULT_INPUT_FIELD = 'text_field';

export type FormattedDgaResp = Array<{
  domain: string;
  maliciousPrediction: boolean;
  maliciousProbability: number;
}>;

export class DgaInference {
  private trainedModelsApi: ReturnType<typeof trainedModelsApiProvider>;
  private model: estypes.MlTrainedModelConfig;
  // private inputField: string;

  constructor(
    trainedModelsApi: ReturnType<typeof trainedModelsApiProvider>,
    model: estypes.MlTrainedModelConfig
  ) {
    this.trainedModelsApi = trainedModelsApi;
    this.model = model;
    // this.inputField = model.input?.field_names[0] ?? DEFAULT_INPUT_FIELD;
  }

  public async infer(inputText: string): Promise<{
    response: FormattedDgaResp;
    rawResponse: DgaInferenceResponse;
  }> {
    const domains = inputText.split('\n');
    const resp = await this.trainedModelsApi.inferDGA(this.model.model_id, domains);

    return { response: parseResponse(resp), rawResponse: resp };
  }
}

function parseResponse(resp: DgaInferenceResponse): FormattedDgaResp {
  return Object.entries(resp).map(([domain, dd]) => ({
    domain,
    maliciousPrediction: !!dd.ml_is_dga.malicious_prediction,
    maliciousProbability: dd.ml_is_dga.malicious_probability,
  }));
}
