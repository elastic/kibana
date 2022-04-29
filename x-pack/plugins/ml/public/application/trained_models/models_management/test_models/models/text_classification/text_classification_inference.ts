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

export class TextClassificationInference extends InferenceBase<TextClassificationResponse> {
  // @ts-expect-error model type is wrong
  private numTopClasses = this.model.inference_config?.text_classification?.num_top_classes || 5;

  public async infer() {
    try {
      this.setRunning();
      const inputText = this.inputText$.value;
      const payload = {
        docs: { [this.inputField]: inputText },
        inference_config: { text_classification: { num_top_classes: this.numTopClasses } },
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
