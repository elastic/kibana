/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { InferenceBase } from '../inference_base';

export type FormattedNerResponse = Array<{
  value: string;
  entity: estypes.MlTrainedModelEntities | null;
}>;

interface InferResponse {
  response: FormattedNerResponse;
  rawResponse: estypes.MlInferTrainedModelDeploymentResponse;
}

export class NerInference extends InferenceBase<InferResponse> {
  public async infer(inputText: string) {
    const payload = { docs: { [this.inputField]: inputText } };
    const resp = await this.trainedModelsApi.inferTrainedModel(this.model.model_id, payload, '30s');

    return { response: parseResponse(resp), rawResponse: resp };
  }
}

function parseResponse(resp: estypes.MlInferTrainedModelDeploymentResponse): FormattedNerResponse {
  const { predicted_value: predictedValue, entities } = resp;
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
