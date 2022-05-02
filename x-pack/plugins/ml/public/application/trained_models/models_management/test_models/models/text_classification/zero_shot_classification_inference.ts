/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { InferenceBase } from '../inference_base';
import { processResponse } from './common';
import type { TextClassificationResponse, RawTextClassificationResponse } from './common';

import { getZeroShotClassificationInput } from './zero_shot_classification_input';
import { getTextClassificationOutputComponent } from './text_classification_output';

export class ZeroShotClassificationInference extends InferenceBase<TextClassificationResponse> {
  public labelsText$ = new BehaviorSubject<string>('');

  public async infer() {
    try {
      this.setRunning();
      const inputText = this.inputText$.value;
      const labelsText = this.labelsText$.value;
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
    return getZeroShotClassificationInput(this);
  }

  public getOutputComponent(): JSX.Element {
    return getTextClassificationOutputComponent(this);
  }
}
