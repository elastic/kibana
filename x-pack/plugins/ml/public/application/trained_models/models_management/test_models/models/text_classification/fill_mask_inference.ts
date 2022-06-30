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
import { SUPPORTED_PYTORCH_TASKS } from '../../../../../../../common/constants/trained_models';

const MASK = '[MASK]';

export class FillMaskInference extends InferenceBase<TextClassificationResponse> {
  protected inferenceType = SUPPORTED_PYTORCH_TASKS.FILL_MASK;
  protected info = [
    i18n.translate('xpack.ml.trainedModels.testModelsFlyout.fillMask.info1', {
      defaultMessage: 'This is some info.',
    }),
    i18n.translate('xpack.ml.trainedModels.testModelsFlyout.fillMask.info2', {
      defaultMessage: 'And this is the next bit of text.',
    }),
  ];

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
      'xpack.ml.trainedModels.testModelsFlyout.fillMask.inputText',
      {
        defaultMessage:
          'Enter a phrase to test. Use [MASK] as a placeholder for the missing words.',
      }
    );

    return getGeneralInputComponent(this, placeholder);
  }

  public getOutputComponent(): JSX.Element {
    return getFillMaskOutputComponent(this);
  }
}
