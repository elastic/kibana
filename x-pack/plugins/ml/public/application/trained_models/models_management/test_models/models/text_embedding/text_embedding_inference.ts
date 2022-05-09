/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { InferenceBase, InferResponse } from '../inference_base';
import { getGeneralInputComponent } from '../text_input';
import { getTextEmbeddingOutputComponent } from './text_embedding_output';

export interface RawTextEmbeddingResponse {
  predicted_value: number[];
}

export interface FormattedTextEmbeddingResponse {
  predictedValue: number[];
}

export type TextEmbeddingResponse = InferResponse<
  FormattedTextEmbeddingResponse,
  RawTextEmbeddingResponse
>;

export class TextEmbeddingInference extends InferenceBase<TextEmbeddingResponse> {
  public async infer() {
    try {
      this.setRunning();
      const inputText = this.inputText$.value;
      const payload = {
        docs: { [this.inputField]: inputText },
      };
      const resp = (await this.trainedModelsApi.inferTrainedModel(
        this.model.model_id,
        payload,
        '30s'
      )) as unknown as RawTextEmbeddingResponse;

      const processedResponse: TextEmbeddingResponse = processResponse(resp, this.model, inputText);
      this.inferenceResult$.next(processedResponse);
      this.setFinished();

      return processedResponse;
    } catch (error) {
      this.setFinishedWithErrors(error);
      throw error;
    }
  }

  public getInputComponent(): JSX.Element {
    return getGeneralInputComponent(this);
  }

  public getOutputComponent(): JSX.Element {
    return getTextEmbeddingOutputComponent(this);
  }
}

function processResponse(
  resp: RawTextEmbeddingResponse,
  model: estypes.MlTrainedModelConfig,
  inputText: string
) {
  const predictedValue = resp.predicted_value;
  return { response: { predictedValue }, rawResponse: resp, inputText };
}
