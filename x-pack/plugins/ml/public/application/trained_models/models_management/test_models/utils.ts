/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { TRAINED_MODEL_TYPE } from '../../../../../common/constants/trained_models';

const TESTABLE_MODEL_TYPES: estypes.MlTrainedModelType[] = [
  TRAINED_MODEL_TYPE.PYTORCH,
  TRAINED_MODEL_TYPE.LANG_IDENT,
];

export function isTestable(model: estypes.MlTrainedModelConfig) {
  return model.model_type && TESTABLE_MODEL_TYPES.includes(model.model_type);
}
