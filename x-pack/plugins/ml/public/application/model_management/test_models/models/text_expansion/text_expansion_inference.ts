/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';
import { SUPPORTED_PYTORCH_TASKS } from '@kbn/ml-trained-models-utils';
import { trainedModelsApiProvider } from '../../../../services/ml_api_service/trained_models';
import { InferenceBase, INPUT_TYPE } from '../inference_base';
import type { InferResponse } from '../inference_base';
import { getGeneralInputComponent } from '../text_input';
import { getTextExpansionOutputComponent } from './text_expansion_output';

export interface TextExpansionPair {
  token: string;
  value: number;
}
export type FormattedTextExpansionResponse = TextExpansionPair[];

export type TextExpansionResponse = InferResponse<
  FormattedTextExpansionResponse,
  estypes.MlInferTrainedModelResponse
>;

export class TextExpansionInference extends InferenceBase<TextExpansionResponse> {
  protected inferenceType = SUPPORTED_PYTORCH_TASKS.NER;
  protected inferenceTypeLabel = i18n.translate(
    'xpack.ml.trainedModels.testModelsFlyout.textExpansion.label',
    { defaultMessage: 'Text expansion' }
  );
  protected info = [
    i18n.translate('xpack.ml.trainedModels.testModelsFlyout.textExpansion.info', {
      defaultMessage: 'Expand text into a sparse representation of tokens weighted by importance.',
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

  protected async inferText() {
    return this.runInfer<estypes.MlInferTrainedModelResponse>(
      () => {},
      (resp, inputText) => {
        return {
          response: parseResponse(resp as unknown as MlInferTrainedModelResponse),
          rawResponse: resp,
          inputText,
        };
      }
    );
  }

  protected async inferIndex() {
    return this.runPipelineSimulate((doc) => {
      return {
        response: parseResponse({ inference_results: [doc._source[this.inferenceType]] }),
        rawResponse: doc._source[this.inferenceType],
        inputText: doc._source[this.getInputField()],
      };
    });
  }

  protected getProcessors() {
    return this.getBasicProcessors();
  }

  public getInputComponent(): JSX.Element | null {
    if (this.inputType === INPUT_TYPE.TEXT) {
      const placeholder = i18n.translate(
        'xpack.ml.trainedModels.testModelsFlyout.textExpansion.inputText',
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
    return getTextExpansionOutputComponent(this);
  }
}

interface MlInferTrainedModelResponse {
  inference_results: TextExpansionPredictedValue[];
}

interface TextExpansionPredictedValue {
  predicted_value: Record<string, number>;
}

function parseResponse(resp: MlInferTrainedModelResponse): FormattedTextExpansionResponse {
  const [{ predicted_value: predictedValue }] = resp.inference_results;

  if (predictedValue === undefined) {
    return [];
  }

  return Object.entries(predictedValue).map(([token, value]) => {
    return { token, value };
  });
}
