/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { estypes } from '@elastic/elasticsearch';
import { map } from 'rxjs/operators';
import { InferenceBase, INPUT_TYPE } from '../inference_base';
import type { TextClassificationResponse, RawTextClassificationResponse } from './common';
import { processResponse, processInferenceResult } from './common';
import { getGeneralInputComponent } from '../text_input';
import { getFillMaskOutputComponent } from './fill_mask_output';
import { SUPPORTED_PYTORCH_TASKS } from '../../../../../../common/constants/trained_models';
import { trainedModelsApiProvider } from '../../../../services/ml_api_service/trained_models';

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

  constructor(
    trainedModelsApi: ReturnType<typeof trainedModelsApiProvider>,
    model: estypes.MlTrainedModelConfig,
    inputType: INPUT_TYPE
  ) {
    super(trainedModelsApi, model, inputType);

    this.initialize([
      this.inputText$.pipe(map((inputText) => inputText.every((t) => t.includes(MASK)))),
    ]);
  }

  protected async inferText() {
    return this.runInfer<RawTextClassificationResponse>(
      () => {
        return this.getInferenceConfig(this.getNumTopClassesConfig());
      },
      (resp, inputText) => {
        return processResponse(resp, this.model, inputText);
      }
    );
  }

  protected async inferIndex() {
    return this.runPipelineSimulate((doc) => {
      return {
        response: processInferenceResult(doc._source[this.inferenceType], this.model),
        rawResponse: doc._source[this.inferenceType],
        inputText: doc._source[this.getInputField()],
      };
    });
  }

  protected getProcessors() {
    return this.getBasicProcessors(this.getNumTopClassesConfig());
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
