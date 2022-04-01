/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { trainedModelsApiProvider } from '../../../../services/ml_api_service/trained_models';

const DEFAULT_INPUT_FIELD = 'text_field';

export type FormattedNerResponse = Array<{
  value: string;
  entity: estypes.MlTrainedModelEntities | null;
}>;

export abstract class InferenceBase<TInferResponse> {
  protected readonly inputField: string;

  constructor(
    protected trainedModelsApi: ReturnType<typeof trainedModelsApiProvider>,
    protected model: estypes.MlTrainedModelConfig
  ) {
    this.inputField = model.input?.field_names[0] ?? DEFAULT_INPUT_FIELD;
  }

  protected abstract infer(inputText: string): Promise<TInferResponse>;
}
