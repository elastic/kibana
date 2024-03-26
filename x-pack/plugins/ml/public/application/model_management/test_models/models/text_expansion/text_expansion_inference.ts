/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';
import { SUPPORTED_PYTORCH_TASKS } from '@kbn/ml-trained-models-utils';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import type { trainedModelsApiProvider } from '../../../../services/ml_api_service/trained_models';
import type { INPUT_TYPE } from '../inference_base';
import { InferenceBase, type InferResponse } from '../inference_base';
import { getTextExpansionOutputComponent } from './text_expansion_output';
import { getTextExpansionInput } from './text_expansion_input';

export interface TextExpansionPair {
  token: string;
  value: number;
}

export interface FormattedTextExpansionResponse {
  text: string;
  score: number;
  originalTokenWeights: TextExpansionPair[];
  adjustedTokenWeights: TextExpansionPair[];
}

export type TextExpansionResponse = InferResponse<
  FormattedTextExpansionResponse,
  estypes.MlInferTrainedModelResponse
>;

export class TextExpansionInference extends InferenceBase<TextExpansionResponse> {
  protected inferenceType = SUPPORTED_PYTORCH_TASKS.TEXT_EXPANSION;
  protected inferenceTypeLabel = i18n.translate(
    'xpack.ml.trainedModels.testModelsFlyout.textExpansion.label',
    { defaultMessage: 'Text expansion' }
  );
  protected info = [
    i18n.translate('xpack.ml.trainedModels.testModelsFlyout.textExpansion.info', {
      defaultMessage:
        'Expand your search to include relevant terms in the results that are not present in the query.',
    }),
  ];

  private queryText$ = new BehaviorSubject<string>('');
  private queryResults: Record<string, number> = {};

  constructor(
    trainedModelsApi: ReturnType<typeof trainedModelsApiProvider>,
    model: estypes.MlTrainedModelConfig,
    inputType: INPUT_TYPE,
    deploymentId: string
  ) {
    super(trainedModelsApi, model, inputType, deploymentId);

    this.initialize(
      [this.queryText$.pipe(map((questionText) => questionText !== ''))],
      [this.queryText$]
    );
  }

  protected async inferText() {
    return this.runInfer<estypes.MlInferTrainedModelResponse>(
      () => {},
      (resp, inputText) => {
        return {
          response: parseResponse(
            resp as unknown as MlInferTrainedModelResponse,
            '',
            this.queryResults
          ),
          rawResponse: resp,
          inputText,
        };
      }
    );
  }

  protected async inferIndex() {
    const { docs } = await this.trainedModelsApi.trainedModelPipelineSimulate(this.getPipeline(), [
      {
        _source: {
          text_field: this.getQueryText(),
        },
      },
    ]);

    if (docs.length === 0) {
      throw new Error(
        i18n.translate('xpack.ml.trainedModels.testModelsFlyout.textExpansion.noDocsError', {
          defaultMessage: 'No docs loaded',
        })
      );
    }

    this.queryResults = docs[0].doc?._source[this.inferenceType].predicted_value ?? {};

    return this.runPipelineSimulate((doc) => {
      return {
        response: parseResponse(
          { inference_results: [doc._source[this.inferenceType]] },
          doc._source[this.getInputField()],
          this.queryResults
        ),
        rawResponse: doc._source[this.inferenceType],
        inputText: doc._source[this.getInputField()],
      };
    });
  }

  protected getProcessors() {
    return this.getBasicProcessors();
  }

  public setQueryText(text: string) {
    this.queryText$.next(text);
  }

  public getQueryText$() {
    return this.queryText$.asObservable();
  }

  public getQueryText() {
    return this.queryText$.getValue();
  }

  public getInputComponent(): JSX.Element | null {
    const placeholder = i18n.translate(
      'xpack.ml.trainedModels.testModelsFlyout.textExpansion.inputText',
      {
        defaultMessage: 'Enter a phrase to test',
      }
    );
    return getTextExpansionInput(this, placeholder);
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

function parseResponse(
  resp: MlInferTrainedModelResponse,
  text: string,
  queryResults: Record<string, number>
): FormattedTextExpansionResponse {
  const [{ predicted_value: predictedValue }] = resp.inference_results;

  if (predictedValue === undefined) {
    throw new Error(
      i18n.translate('xpack.ml.trainedModels.testModelsFlyout.textExpansion.noPredictionError', {
        defaultMessage: 'No results found',
      })
    );
  }

  // extract token and value pairs
  const originalTokenWeights = Object.entries(predictedValue).map(([token, value]) => ({
    token,
    value,
  }));
  let score = 0;
  const adjustedTokenWeights = originalTokenWeights.map(({ token, value }) => {
    // if token is in query results, multiply value by query result value
    const adjustedValue = value * (queryResults[token] ?? 0);
    score += adjustedValue;
    return {
      token,
      value: adjustedValue,
    };
  });

  return {
    text,
    score,
    originalTokenWeights,
    adjustedTokenWeights,
  };
}
