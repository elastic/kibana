/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { InferenceBase } from '../inference_base';

export interface TextEmbeddingResponse {
  predicted_value: number[];
}

export interface FormattedTextEmbeddingResponse {
  predictedValue: number[];
}

export interface InferResponse {
  inputText: string;
  response: FormattedTextEmbeddingResponse;
  rawResponse: TextEmbeddingResponse;
}

export class TextEmbeddingInference extends InferenceBase<InferResponse> {
  public async infer(inputText: string) {
    this.isRunning$.next(true);
    const payload = {
      docs: { [this.inputField]: inputText },
      // inference_config: { text_embedding: { num_top_classes: 5 } },
    };
    const resp = (await this.trainedModelsApi.inferTrainedModel(
      this.model.model_id,
      payload,
      '30s'
    )) as unknown as TextEmbeddingResponse;

    const processedResponse = processResponse(resp, this.model, inputText);
    this.inferenceResult$.next(processedResponse);
    this.isRunning$.next(false);

    return processedResponse;
  }
}

function processResponse(
  resp: TextEmbeddingResponse,
  model: estypes.MlTrainedModelConfig,
  inputText: string
) {
  const predictedValue = resp.predicted_value;
  return { response: { predictedValue }, rawResponse: resp, inputText };
}
