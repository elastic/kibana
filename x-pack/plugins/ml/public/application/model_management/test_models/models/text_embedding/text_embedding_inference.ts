/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { estypes } from '@elastic/elasticsearch';
import { SUPPORTED_PYTORCH_TASKS } from '@kbn/ml-trained-models-utils';
import { InferenceBase, INPUT_TYPE } from '../inference_base';
import type { InferResponse } from '../inference_base';
import { getGeneralInputComponent } from '../text_input';
import { getTextEmbeddingOutputComponent } from './text_embedding_output';
import { trainedModelsApiProvider } from '../../../../services/ml_api_service/trained_models';

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

  constructor(
    trainedModelsApi: ReturnType<typeof trainedModelsApiProvider>,
    model: estypes.MlTrainedModelConfig,
    inputType: INPUT_TYPE,
    deploymentId: string
  ) {
    super(trainedModelsApi, model, inputType, deploymentId);

    this.initialize();
  }

  public async inferText() {
    return this.runInfer<RawTextEmbeddingResponse>(
      () => {},
      (resp, inputText) => {
        return processTextResponse(resp, inputText);
      }
    );
  }

  protected async inferIndex() {
    return this.runPipelineSimulate((doc) => {
      const inputText = doc._source[this.getInputField()];
      return processIndexResponse(doc._source[this.inferenceType], inputText);
    });
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
