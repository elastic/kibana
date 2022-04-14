/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceBase } from '../inference_base';
import type { InferResponse, TextClassificationResponse } from './common';
import { processResponse } from './common';

export class FillMaskInference extends InferenceBase<InferResponse> {
  public async infer(inputText: string) {
    const payload = {
      docs: { [this.inputField]: inputText },
      // inference_config: { fill_mask: { num_top_classes: 5 } },
    };
    const resp = (await this.trainedModelsApi.inferTrainedModel(
      this.model.model_id,
      payload,
      '30s'
    )) as unknown as TextClassificationResponse;

    return processResponse(resp, this.model);
  }
}
