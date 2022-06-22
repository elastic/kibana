/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { InferResponse } from '../inference_base';

const PROBABILITY_SIG_FIGS = 3;

export interface RawTextClassificationResponse {
  inference_results: Array<{
    predicted_value: string;
    prediction_probability: number;
    top_classes?: Array<{
      class_name: string;
      class_probability: number;
      class_score: number;
    }>;
  }>;
}

export type FormattedTextClassificationResponse = Array<{
  value: string;
  predictionProbability: number;
}>;

export type TextClassificationResponse = InferResponse<
  FormattedTextClassificationResponse,
  RawTextClassificationResponse
>;

export function processResponse(
  resp: RawTextClassificationResponse,
  model: estypes.MlTrainedModelConfig,
  inputText: string
): TextClassificationResponse {
  const {
    inference_results: [inferenceResults],
  } = resp;
  const labels: string[] = model.inference_config.text_classification?.classification_labels ?? [];

  let formattedResponse = [
    {
      value: inferenceResults.predicted_value,
      predictionProbability: inferenceResults.prediction_probability,
    },
  ];

  if (inferenceResults.top_classes !== undefined) {
    // if num_top_classes has been specified in the model,
    // base the returned results on this list
    formattedResponse = inferenceResults.top_classes.map((topClass) => {
      return {
        value: topClass.class_name,
        predictionProbability: topClass.class_probability,
      };
    });
  } else if (labels.length === 2) {
    // otherwise, if the config only contains two classification_labels
    // we can safely assume the non-top value and return two results
    formattedResponse = labels.map((value) => {
      const predictionProbability =
        inferenceResults.predicted_value === value
          ? inferenceResults.prediction_probability
          : 1 - inferenceResults.prediction_probability;

      return {
        value,
        predictionProbability,
      };
    });
  }

  return {
    response: formattedResponse
      .map(({ value, predictionProbability }) => ({
        value,
        predictionProbability: Number(predictionProbability.toPrecision(PROBABILITY_SIG_FIGS)),
      }))
      .sort((a, b) => a.predictionProbability - b.predictionProbability)
      .reverse(),
    rawResponse: resp,
    inputText,
  };
}
