/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceBase } from '../inference_base';
import { processResponse } from './common';
import type { InferResponse, TextClassificationResponse } from './common';

export class ZeroShotClassificationInference extends InferenceBase<InferResponse> {
  public async infer(inputText: string, labelsText?: string) {
    const inputLabels = labelsText?.split(',').map((l) => l.trim());
    const payload = {
      docs: { [this.inputField]: inputText },
      inference_config: {
        zero_shot_classification: {
          labels: inputLabels,
          multi_label: false,
        },
      },
    };
    const resp = (await this.trainedModelsApi.inferTrainedModel(
      this.model.model_id,
      payload,
      '30s'
    )) as unknown as TextClassificationResponse;

    return processResponse(resp, this.model);
  }
}
