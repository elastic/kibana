/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { estypes } from '@elastic/elasticsearch';
import { InferenceBase, INPUT_TYPE } from '../inference_base';
import { processInferenceResult, processResponse } from './common';
import type { TextClassificationResponse, RawTextClassificationResponse } from './common';
import { getGeneralInputComponent } from '../text_input';
import { getTextClassificationOutputComponent } from './text_classification_output';
import { SUPPORTED_PYTORCH_TASKS } from '../../../../../../common/constants/trained_models';
import { trainedModelsApiProvider } from '../../../../services/ml_api_service/trained_models';

export class TextClassificationInference extends InferenceBase<TextClassificationResponse> {
  protected inferenceType = SUPPORTED_PYTORCH_TASKS.TEXT_CLASSIFICATION;
  protected inferenceTypeLabel = i18n.translate(
    'xpack.ml.trainedModels.testModelsFlyout.textClassification.label',
    { defaultMessage: 'Text classification' }
  );
  protected info = [
    i18n.translate('xpack.ml.trainedModels.testModelsFlyout.textClassification.info1', {
      defaultMessage: 'Test how well the model classifies your input text.',
    }),
  ];

  constructor(
    trainedModelsApi: ReturnType<typeof trainedModelsApiProvider>,
    model: estypes.MlTrainedModelConfig,
    inputType: INPUT_TYPE
  ) {
    super(trainedModelsApi, model, inputType);

    this.initialize();
  }

  public async inferText() {
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

  public getInputComponent(): JSX.Element | null {
    if (this.inputType === INPUT_TYPE.TEXT) {
      const placeholder = i18n.translate(
        'xpack.ml.trainedModels.testModelsFlyout.textClassification.inputText',
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
    return getTextClassificationOutputComponent(this);
  }
}
