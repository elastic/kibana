/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

const PROBABILITY_SIG_FIGS = 3;

export interface TextClassificationResponse {
  predicted_value: string;
  prediction_probability: number;
  top_classes?: Array<{
    class_name: string;
    class_probability: number;
    class_score: number;
  }>;
}

export type FormattedTextClassificationResponse = Array<{
  value: string;
  predictionProbability: number;
}>;

export interface InferResponse {
  response: FormattedTextClassificationResponse;
  rawResponse: TextClassificationResponse;
}

export function processResponse(
  resp: TextClassificationResponse,
  model: estypes.MlTrainedModelConfig
): InferResponse {
  const labels: string[] =
    // @ts-expect-error inference config is wrong
    model.inference_config.text_classification?.classification_labels ?? [];

  let formattedResponse = [
    {
      value: resp.predicted_value,
      predictionProbability: resp.prediction_probability,
    },
  ];

  if (resp.top_classes !== undefined) {
    // if num_top_classes has been specified in the model,
    // base the returned results on this list
    formattedResponse = resp.top_classes.map((topClass) => {
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
        resp.predicted_value === value
          ? resp.prediction_probability
          : 1 - resp.prediction_probability;

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
  };
}
