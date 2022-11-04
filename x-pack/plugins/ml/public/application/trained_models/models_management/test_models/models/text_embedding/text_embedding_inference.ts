/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_INFERENCE_TIME_OUT, InferenceBase, INPUT_TYPE } from '../inference_base';
import type { InferResponse } from '../inference_base';
import { getGeneralInputComponent } from '../text_input';
import { getTextEmbeddingOutputComponent } from './text_embedding_output';
import { SUPPORTED_PYTORCH_TASKS } from '../../../../../../../common/constants/trained_models';

export interface RawTextEmbeddingResponse {
  inference_results: Array<{ predicted_value: number[] }>;
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
      defaultMessage: 'Test how well the model generates embeddings for your text.',
    }),
  ];

  public async inferText() {
    try {
      this.setRunning();
      const inputText = this.getInputText();
      const payload = {
        docs: [{ [this.inputField]: inputText }],
      };
      const resp = (await this.trainedModelsApi.inferTrainedModel(
        this.model.model_id,
        payload,
        DEFAULT_INFERENCE_TIME_OUT
      )) as unknown as RawTextEmbeddingResponse;

      const processedResponse: TextEmbeddingResponse = processTextResponse(resp, inputText);
      this.inferenceResult$.next([processedResponse]);
      this.setFinished();

      return [processedResponse];
    } catch (error) {
      this.setFinishedWithErrors(error);
      throw error;
    }
  }

  protected async inferIndex() {
    try {
      this.setRunning();
      const { docs } = await this.trainedModelsApi.trainedModelPipelineSimulate(
        this.getPipeline(),
        this.getPipelineDocs()
      );

      const processedResponse: TextEmbeddingResponse[] = docs.map((d) => {
        // @ts-expect-error error does not exist in type
        const { doc, error } = d;
        if (doc === undefined) {
          if (error) {
            this.setFinishedWithErrors(error);
            throw Error(error.reason);
          }
          throw Error('No doc aaaggghhhhhhh'); // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        }

        const inputText = doc._source[this.inputField];

        return processIndexResponse(doc._source[this.inferenceType], inputText);
      });

      this.inferenceResult$.next(processedResponse);
      this.setFinished();
      return processedResponse;
    } catch (error) {
      this.setFinishedWithErrors(error);
      throw error;
    }
  }

  protected getProcessors() {
    return this.getBasicProcessors();
  }

  public getInputComponent(): JSX.Element | null {
    if (this.inputType === INPUT_TYPE.TEXT) {
      const placeholder = i18n.translate(
        'xpack.ml.trainedModels.testModelsFlyout.textEmbedding.inputText',
        {
          defaultMessage: 'Enter a phrase to test',
        }
      );
      return getGeneralInputComponent(this, placeholder);
    } else {
      return null;
    }
  }

  public getOutputComponent(): JSX.Element {
    return getTextEmbeddingOutputComponent(this);
  }
}

function processTextResponse(
  resp: RawTextEmbeddingResponse,

  inputText: string
) {
  const predictedValue = resp.inference_results[0].predicted_value;
  return { response: { predictedValue }, rawResponse: resp, inputText };
}

function processIndexResponse(resp: { predicted_value: number[] }, inputText: string) {
  const predictedValue = resp.predicted_value;
  return {
    response: { predictedValue },
    rawResponse: { inference_results: [{ predicted_value: predictedValue }] },
    inputText,
  };
}
