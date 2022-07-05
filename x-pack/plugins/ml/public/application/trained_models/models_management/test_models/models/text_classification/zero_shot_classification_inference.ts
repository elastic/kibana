/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { BehaviorSubject } from 'rxjs';
import { InferenceBase } from '../inference_base';
import { processResponse } from './common';
import type { TextClassificationResponse, RawTextClassificationResponse } from './common';

import { getZeroShotClassificationInput } from './zero_shot_classification_input';
import { getTextClassificationOutputComponent } from './text_classification_output';
import { SUPPORTED_PYTORCH_TASKS } from '../../../../../../../common/constants/trained_models';

export class ZeroShotClassificationInference extends InferenceBase<TextClassificationResponse> {
  protected inferenceType = SUPPORTED_PYTORCH_TASKS.ZERO_SHOT_CLASSIFICATION;
  protected inferenceTypeLabel = i18n.translate(
    'xpack.ml.trainedModels.testModelsFlyout.zeroShotClassification.label',
    { defaultMessage: 'Zero shot classification' }
  );

  public labelsText$ = new BehaviorSubject<string>('');

  public async infer() {
    try {
      this.setRunning();
      const inputText = this.inputText$.getValue();
      const labelsText = this.labelsText$.value;
      const inputLabels = labelsText?.split(',').map((l) => l.trim());
      const payload = {
        docs: [{ [this.inputField]: inputText }],
        inference_config: {
          [this.inferenceType]: {
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
    const placeholder = i18n.translate(
      'xpack.ml.trainedModels.testModelsFlyout.zeroShotClassification.inputText',
      {
        defaultMessage: 'Enter a phrase to test',
      }
    );
    return getZeroShotClassificationInput(this, placeholder);
  }

  public getOutputComponent(): JSX.Element {
    return getTextClassificationOutputComponent(this);
  }
}
