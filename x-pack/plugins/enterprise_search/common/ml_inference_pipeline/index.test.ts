/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlTrainedModelConfig } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { BUILT_IN_MODEL_TAG } from '@kbn/ml-plugin/common/constants/data_frame_analytics';

import { getMlModelTypesForModelConfig, BUILT_IN_MODEL_TAG as LOCAL_BUILT_IN_MODEL_TAG } from '.';

describe('getMlModelTypesForModelConfig lib function', () => {
  const mockModel: MlTrainedModelConfig = {
    inference_config: {
      ner: {},
    },
    input: {
      field_names: [],
    },
    model_id: 'test_id',
    model_type: 'pytorch',
    tags: ['test_tag'],
  };
  const builtInMockModel: MlTrainedModelConfig = {
    inference_config: {
      text_classification: {},
    },
    input: {
      field_names: [],
    },
    model_id: 'test_id',
    model_type: 'lang_ident',
    tags: [BUILT_IN_MODEL_TAG],
  };

  it('should return the model type and inference config type', () => {
    const expected = ['pytorch', 'ner'];
    const response = getMlModelTypesForModelConfig(mockModel);
    expect(response.sort()).toEqual(expected.sort());
  });

  it('should include the built in type', () => {
    const expected = ['lang_ident', 'text_classification', BUILT_IN_MODEL_TAG];
    const response = getMlModelTypesForModelConfig(builtInMockModel);
    expect(response.sort()).toEqual(expected.sort());
  });

  it('local BUILT_IN_MODEL_TAG matches ml plugin', () => {
    expect(LOCAL_BUILT_IN_MODEL_TAG).toEqual(BUILT_IN_MODEL_TAG);
  });
});
