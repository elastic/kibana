/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_INFERENCE_TIME_OUT, InferenceBase, INPUT_TYPE } from '../inference_base';
import type { TextClassificationResponse, RawTextClassificationResponse } from './common';
import { processResponse, processInferenceResult } from './common';
import { getGeneralInputComponent } from '../text_input';
import { getFillMaskOutputComponent } from './fill_mask_output';
import { SUPPORTED_PYTORCH_TASKS } from '../../../../../../../common/constants/trained_models';

const MASK = '[MASK]';

export class FillMaskInference extends InferenceBase<TextClassificationResponse> {
  protected inferenceType = SUPPORTED_PYTORCH_TASKS.FILL_MASK;
  protected inferenceTypeLabel = i18n.translate(
    'xpack.ml.trainedModels.testModelsFlyout.fillMask.label',
    { defaultMessage: 'Fill mask' }
  );

  protected info = [
    i18n.translate('xpack.ml.trainedModels.testModelsFlyout.fillMask.info1', {
      defaultMessage: 'Test how well the model predicts a missing word in a phrase.',
    }),
  ];

  protected async inferText() {
    try {
      this.setRunning();
      const inputText = this.getInputText();
      const payload = {
        docs: [{ [this.inputField]: inputText }],
        ...this.getInferenceConfig([this.getNumTopClassesConfig()]),
      };
      const resp = (await this.trainedModelsApi.inferTrainedModel(
        this.model.model_id,
        payload,
        DEFAULT_INFERENCE_TIME_OUT
      )) as unknown as RawTextClassificationResponse;

      const processedResponse = processResponse(resp, this.model, inputText);
      this.inferenceResult$.next([processedResponse]);
      this.setFinished();

      return [processedResponse];
    } catch (error) {
      this.setFinishedWithErrors(error);
      throw error;
    }
  }

  protected async inferIndex() {
    try {
      this.setRunning();
      const { docs } = await this.trainedModelsApi.trainedModelPipelineSimulate(
        this.getPipeline(),
        this.getPipelineDocs()
      );

      const processedResponse: TextClassificationResponse[] = docs.map(({ doc }) => {
        if (doc === undefined) {
          throw Error('No doc aaaggghhhhhhh'); // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        }

        return {
          response: processInferenceResult(doc._source[this.inferenceType], this.model),
          rawResponse: doc._source[this.inferenceType],
          inputText: doc._source[this.inputField],
        };
      });

      this.inferenceResult$.next(processedResponse);
      this.setFinished();
      return processedResponse;
    } catch (error) {
      this.setFinishedWithErrors(error);
      throw error;
    }
  }

  protected getProcessors() {
    return this.getBasicProcessors([this.getNumTopClassesConfig()]);
  }

  public predictedValue(resp: TextClassificationResponse) {
    const { response, inputText } = resp;
    return response[0]?.value ? inputText.replace(MASK, response[0].value) : inputText;
  }

  public getInputComponent(): JSX.Element | null {
    if (this.inputType === INPUT_TYPE.TEXT) {
      const placeholder = i18n.translate(
        'xpack.ml.trainedModels.testModelsFlyout.fillMask.inputText',
        {
          defaultMessage:
            'Enter a phrase to test. Use [MASK] as a placeholder for the missing words.',
        }
      );

      return getGeneralInputComponent(this, placeholder);
    } else {
      return null;
    }
  }

  public getOutputComponent(): JSX.Element {
    return getFillMaskOutputComponent(this);
  }
}
