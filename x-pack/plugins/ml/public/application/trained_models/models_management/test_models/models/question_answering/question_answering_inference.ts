/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { BehaviorSubject } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { InferenceBase, InferResponse } from '../inference_base';
import { getQuestionAnsweringInput } from './question_answering_input';
import { getQuestionAnsweringOutputComponent } from './question_answering_output';
import { SUPPORTED_PYTORCH_TASKS } from '../../../../../../../common/constants/trained_models';

export interface RawQuestionAnsweringResponse {
  inference_results: Array<{
    predicted_value: string;
    prediction_probability: number;
    start_offset: number;
    end_offset: number;
    top_classes?: Array<{
      end_offset: number;
      score: number;
      start_offset: number;
      answer: string;
    }>;
  }>;
}

export interface FormattedQuestionAnsweringResult {
  value: string;
  predictionProbability: number;
  startOffset: number;
  endOffset: number;
}

export type FormattedQuestionAnsweringResponse = FormattedQuestionAnsweringResult[];

export type QuestionAnsweringResponse = InferResponse<
  FormattedQuestionAnsweringResponse,
  RawQuestionAnsweringResponse
>;

export class QuestionAnsweringInference extends InferenceBase<QuestionAnsweringResponse> {
  protected inferenceType = SUPPORTED_PYTORCH_TASKS.QUESTION_ANSWERING;
  protected inferenceTypeLabel = i18n.translate(
    'xpack.ml.trainedModels.testModelsFlyout.questionAnswer.label',
    { defaultMessage: 'Question answering' }
  );
  protected info = [
    i18n.translate('xpack.ml.trainedModels.testModelsFlyout.questionAnswer.info1', {
      defaultMessage:
        'Provide a question and test how well the model extracts an answer from your input text.',
    }),
  ];

  public questionText$ = new BehaviorSubject<string>('');

  public async infer() {
    try {
      this.setRunning();
      const inputText = this.inputText$.getValue();
      const questionText = this.questionText$.value;
      const numTopClassesConfig = this.getNumTopClassesConfig()?.inference_config;

      const payload = {
        docs: [{ [this.inputField]: inputText }],
        inference_config: {
          [this.inferenceType]: {
            question: questionText,
            ...(numTopClassesConfig
              ? {
                  num_top_classes: numTopClassesConfig[this.inferenceType].num_top_classes,
                }
              : {}),
          },
        },
      };
      const resp = (await this.trainedModelsApi.inferTrainedModel(
        this.model.model_id,
        payload,
        '30s'
      )) as unknown as RawQuestionAnsweringResponse;

      const processedResponse: QuestionAnsweringResponse = processResponse(
        resp,
        this.model,
        inputText
      );

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
      'xpack.ml.trainedModels.testModelsFlyout.questionAnswer.inputText',
      {
        defaultMessage: "Enter unstructured text phrases related to the answers you're seeking",
      }
    );
    return getQuestionAnsweringInput(this, placeholder);
  }

  public getOutputComponent(): JSX.Element {
    return getQuestionAnsweringOutputComponent(this);
  }
}

function processResponse(
  resp: RawQuestionAnsweringResponse,
  model: estypes.MlTrainedModelConfig,
  inputText: string
) {
  const {
    inference_results: [inferenceResults],
  } = resp;

  let formattedResponse = [
    {
      value: inferenceResults.predicted_value,
      predictionProbability: inferenceResults.prediction_probability,
      startOffset: inferenceResults.start_offset,
      endOffset: inferenceResults.end_offset,
    },
  ];

  if (inferenceResults.top_classes !== undefined) {
    formattedResponse = inferenceResults.top_classes.map((topClass) => {
      return {
        value: topClass.answer,
        predictionProbability: topClass.score,
        startOffset: topClass.start_offset,
        endOffset: topClass.end_offset,
      };
    });
  }

  return {
    response: formattedResponse,
    rawResponse: resp,
    inputText,
  };
}
