/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceBase } from '../inference_base';
import { processResponse } from './common';
import type { TextClassificationResponse, RawTextClassificationResponse } from './common';
import { getGeneralInputComponent } from '../text_input';
import { getTextClassificationOutputComponent } from './text_classification_output';
import { SUPPORTED_PYTORCH_TASKS } from '../../../../../../../common/constants/trained_models';

export class TextClassificationInference extends InferenceBase<TextClassificationResponse> {
  protected inferenceType = SUPPORTED_PYTORCH_TASKS.TEXT_CLASSIFICATION;

  public async infer() {
    try {
      this.setRunning();
      const inputText = this.inputText$.getValue();
      const payload = {
        docs: [{ [this.inputField]: inputText }],
        ...this.getNumTopClassesConfig(),
      };
      const resp = (await this.trainedModelsApi.inferTrainedModel(
        this.model.model_id,
        payload,
        '30s'
      )) as unknown as RawTextClassificationResponse;

      const processedResponse: TextClassificationResponse = processResponse(
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
    return getGeneralInputComponent(this);
  }

  public getOutputComponent(): JSX.Element {
    return getTextClassificationOutputComponent(this);
  }
}
