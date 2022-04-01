/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceBase } from '../inference_base';

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

interface InferResponse {
  response: FormattedTextClassificationResponse;
  rawResponse: TextClassificationResponse;
}

const PROBABILITY_SIG_FIGS = 3;

export class TextClassificationInference extends InferenceBase<InferResponse> {
  public async infer(inputText: string) {
    const payload = {
      docs: { [this.inputField]: inputText },
    };
    const resp = (await this.trainedModelsApi.inferTrainedModel(
      this.model.model_id,
      payload,
      '30s'
    )) as unknown as TextClassificationResponse;

    const labels: string[] =
      // @ts-expect-error inference config is wrong
      this.model.inference_config.text_classification?.classification_labels ?? [];

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
          predictionProbability: Number(
            topClass.class_probability.toPrecision(PROBABILITY_SIG_FIGS)
          ),
        };
      });
    } else if (labels.length === 2) {
      // otherwise, if the config only contains two classification_labels
      // we can safely assume the non-top value and return two results
      formattedResponse = labels.map((l) => {
        const predictionProbability =
          resp.predicted_value === l
            ? resp.prediction_probability
            : 1 - resp.prediction_probability;

        return {
          value: l,
          predictionProbability: Number(predictionProbability.toPrecision(PROBABILITY_SIG_FIGS)),
        };
      });
    }

    return {
      response: formattedResponse
        .sort((a, b) => a.predictionProbability - b.predictionProbability)
        .reverse(),
      rawResponse: resp,
    };
  }
}
