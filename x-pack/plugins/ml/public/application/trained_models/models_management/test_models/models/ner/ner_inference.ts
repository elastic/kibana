/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';
import { DEFAULT_INFERENCE_TIME_OUT, InferenceBase, INPUT_TYPE } from '../inference_base';
import type { InferResponse } from '../inference_base';
import { getGeneralInputComponent } from '../text_input';
import { getNerOutputComponent } from './ner_output';
import { SUPPORTED_PYTORCH_TASKS } from '../../../../../../../common/constants/trained_models';

export type FormattedNerResponse = Array<{
  value: string;
  entity: estypes.MlTrainedModelEntities | null;
}>;

export type NerResponse = InferResponse<FormattedNerResponse, estypes.MlInferTrainedModelResponse>;

export class NerInference extends InferenceBase<NerResponse> {
  protected inferenceType = SUPPORTED_PYTORCH_TASKS.NER;
  protected inferenceTypeLabel = i18n.translate(
    'xpack.ml.trainedModels.testModelsFlyout.ner.label',
    { defaultMessage: 'Named entity recognition' }
  );
  protected info = [
    i18n.translate('xpack.ml.trainedModels.testModelsFlyout.ner.info1', {
      defaultMessage: 'Test how well the model identifies named entities in your input text.',
    }),
  ];

  protected async inferText() {
    try {
      this.setRunning();
      const inputText = this.getInputText();
      const payload = { docs: [{ [this.inputField]: inputText }] };
      const resp = await this.trainedModelsApi.inferTrainedModel(
        this.model.model_id,
        payload,
        DEFAULT_INFERENCE_TIME_OUT
      );

      const processedResponse: NerResponse = {
        response: parseResponse(resp),
        rawResponse: resp,
        inputText,
      };
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

      const processedResponse: NerResponse[] = docs.map(({ doc }) => {
        if (doc === undefined) {
          throw Error('No doc aaaggghhhhhhh'); // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        }

        return {
          response: parseResponse({ inference_results: [doc._source[this.inferenceType]] }),
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
    return this.getBasicProcessors();
  }

  public getInputComponent(): JSX.Element | null {
    if (this.inputType === INPUT_TYPE.TEXT) {
      const placeholder = i18n.translate('xpack.ml.trainedModels.testModelsFlyout.ner.inputText', {
        defaultMessage: 'Enter a phrase to test',
      });
      return getGeneralInputComponent(this, placeholder);
    } else {
      return null;
    }
  }

  public getOutputComponent(): JSX.Element {
    return getNerOutputComponent(this);
  }
}

function parseResponse(resp: estypes.MlInferTrainedModelResponse): FormattedNerResponse {
  const [{ predicted_value: predictedValue, entities }] = resp.inference_results;
  const splitWordsAndEntitiesRegex = /(\[.*?\]\(.*?&.*?\))/;
  const matchEntityRegex = /(\[.*?\])\((.*?)&(.*?)\)/;
  if (predictedValue === undefined || entities === undefined) {
    return [];
  }

  const sentenceChunks = (predictedValue as unknown as string).split(splitWordsAndEntitiesRegex);
  let count = 0;
  return sentenceChunks.map((chunk) => {
    const matchedEntity = chunk.match(matchEntityRegex);
    if (matchedEntity) {
      const entityValue = matchedEntity[3];
      const entity = entities[count];
      if (entityValue !== entity.entity && entityValue.replaceAll('+', ' ') !== entity.entity) {
        // entityValue may not equal entity.entity if the entity is comprised of
        // two words as they are joined with a plus symbol
        // Replace any plus symbols and check again. If they still don't match, log an error

        // eslint-disable-next-line no-console
        console.error('mismatch entity', entity);
      }
      count++;
      return { value: entity.entity, entity };
    }
    return { value: chunk, entity: null };
  });
}
