/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { InferenceBase } from '../inference_base';
import type { TextClassificationResponse, RawTextClassificationResponse } from './common';
import { processResponse } from './common';
import { getGeneralInputComponent } from '../text_input';
import { getFillMaskOutputComponent } from './fill_mask_output';

const MASK = '[MASK]';

export class FillMaskInference extends InferenceBase<TextClassificationResponse> {
  // @ts-expect-error model type is wrong
  private numTopClasses = this.model.inference_config?.fill_mask?.num_top_classes || 5;

  public async infer() {
    try {
      this.setRunning();
      const inputText = this.inputText$.value;
      const payload = {
        docs: { [this.inputField]: inputText },
        inference_config: { fill_mask: { num_top_classes: this.numTopClasses } },
      };
      const resp = (await this.trainedModelsApi.inferTrainedModel(
        this.model.model_id,
        payload,
        '30s'
      )) as unknown as RawTextClassificationResponse;

      const processedResponse = processResponse(resp, this.model, inputText);
      this.inferenceResult$.next(processedResponse);
      this.setFinished();

      return processedResponse;
    } catch (error) {
      this.setFinishedWithErrors(error);
      throw error;
    }
  }

  public predictedValue() {
    const result = this.inferenceResult$.value;
    if (result === null) {
      return '';
    }
    return result.response[0]?.value
      ? result.inputText.replace(MASK, result.response[0].value)
      : result.inputText;
  }

  public getInputComponent(): JSX.Element {
    const placeholder = i18n.translate(
      'xpack.ml.trainedModels.testModelsFlyout.langIdent.inputText',
      {
        defaultMessage: 'Mask token: [MASK]. e.g. Paris is the [MASK] of France.',
      }
    );

    return getGeneralInputComponent(this, placeholder);
  }

  public getOutputComponent(): JSX.Element {
    return getFillMaskOutputComponent(this);
  }
}
