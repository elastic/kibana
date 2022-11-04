/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_INFERENCE_TIME_OUT, InferenceBase, INPUT_TYPE } from '../inference_base';
import type { InferenceType } from '../inference_base';
import { processInferenceResult, processResponse } from './common';
import { getGeneralInputComponent } from '../text_input';
import { getLangIdentOutputComponent } from './lang_ident_output';
import type { TextClassificationResponse, RawTextClassificationResponse } from './common';

export class LangIdentInference extends InferenceBase<TextClassificationResponse> {
  protected inferenceType: InferenceType = 'classification';
  protected inferenceTypeLabel = i18n.translate(
    'xpack.ml.trainedModels.testModelsFlyout.langIdent.label',
    { defaultMessage: 'Language identification' }
  );
  protected info = [
    i18n.translate('xpack.ml.trainedModels.testModelsFlyout.langIdent.info1', {
      defaultMessage: 'Test how well the model identifies the language of your text.',
    }),
  ];

  public async inferText() {
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

      const processedResponse: TextClassificationResponse = processResponse(
        resp,
        this.model,
        inputText
      );
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

      const processedResponse: TextClassificationResponse[] = docs.map((d) => {
        // @ts-expect-error error does not exist in type
        const { doc, error } = d;
        if (doc === undefined) {
          if (error) {
            this.setFinishedWithErrors(error);
            throw Error(error.reason);
          }
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

  public getInputComponent(): JSX.Element | null {
    if (this.inputType === INPUT_TYPE.TEXT) {
      const placeholder = i18n.translate(
        'xpack.ml.trainedModels.testModelsFlyout.langIdent.inputText',
        {
          defaultMessage: 'Enter a phrase to test',
        }
      );
      return getGeneralInputComponent(this, placeholder);
    } else {
      return null;
    }
  }

  public getOutputComponent(): JSX.Element {
    return getLangIdentOutputComponent(this);
  }
}
