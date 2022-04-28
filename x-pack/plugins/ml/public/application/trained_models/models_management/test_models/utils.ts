/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  TRAINED_MODEL_TYPE,
  SUPPORTED_PYTORCH_TASKS,
} from '../../../../../common/constants/trained_models';
import type { SupportedPytorchTasksType } from '../../../../../common/constants/trained_models';

const PYTORCH_TYPES = Object.values(SUPPORTED_PYTORCH_TASKS);

export function isTestable(model: estypes.MlTrainedModelConfig) {
  if (
    model.model_type === TRAINED_MODEL_TYPE.PYTORCH &&
    PYTORCH_TYPES.includes(Object.keys(model.inference_config)[0] as SupportedPytorchTasksType)
  ) {
    return true;
  }

  if (model.model_type === TRAINED_MODEL_TYPE.LANG_IDENT) {
    return true;
  }

  return false;
}
