/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { i18n } from '@kbn/i18n';
import { InferenceBase, InferResponse } from '../inference_base';
import { getGeneralInputComponent } from '../text_input';
import { getTextEmbeddingOutputComponent } from './text_embedding_output';
import { SUPPORTED_PYTORCH_TASKS } from '../../../../../../../common/constants/trained_models';

export interface RawTextEmbeddingResponse {
  inference_results: [{ predicted_value: number[] }];
}

export interface FormattedTextEmbeddingResponse {
  predictedValue: number[];
}

export type TextEmbeddingResponse = InferResponse<
  FormattedTextEmbeddingResponse,
  RawTextEmbeddingResponse
>;

export class TextEmbeddingInference extends InferenceBase<TextEmbeddingResponse> {
  protected inferenceType = SUPPORTED_PYTORCH_TASKS.TEXT_EMBEDDING;
  protected inferenceTypeLabel = i18n.translate(
    'xpack.ml.trainedModels.testModelsFlyout.textEmbedding.label',
    { defaultMessage: 'Text embedding' }
  );
  protected info = [
    i18n.translate('xpack.ml.trainedModels.testModelsFlyout.textEmbedding.info1', {
      defaultMessage: 'Test how well the model generates embeddings for your text',
    }),
  ];

  public async infer() {
    try {
      this.setRunning();
      const inputText = this.inputText$.getValue();
      const payload = {
        docs: [{ [this.inputField]: inputText }],
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
    const placeholder = i18n.translate(
      'xpack.ml.trainedModels.testModelsFlyout.textEmbedding.inputText',
      {
        defaultMessage: 'Enter a phrase to test',
      }
    );
    return getGeneralInputComponent(this, placeholder);
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
  const predictedValue = resp.inference_results[0].predicted_value;
  return { response: { predictedValue }, rawResponse: resp, inputText };
}
