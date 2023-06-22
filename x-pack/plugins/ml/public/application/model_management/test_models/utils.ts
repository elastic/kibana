/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TRAINED_MODEL_TYPE,
  DEPLOYMENT_STATE,
  SUPPORTED_PYTORCH_TASKS,
  type SupportedPytorchTasksType,
} from '@kbn/ml-trained-models-utils';
import type { ModelItem } from '../models_list';

const PYTORCH_TYPES = Object.values(SUPPORTED_PYTORCH_TASKS).filter(
  (taskType) => taskType !== SUPPORTED_PYTORCH_TASKS.TEXT_EXPANSION
);

export function isTestable(modelItem: ModelItem, checkForState = false) {
  if (
    modelItem.model_type === TRAINED_MODEL_TYPE.PYTORCH &&
    PYTORCH_TYPES.includes(
      Object.keys(modelItem.inference_config)[0] as SupportedPytorchTasksType
    ) &&
    (checkForState === false ||
      modelItem.stats?.deployment_stats?.some((v) => v.state === DEPLOYMENT_STATE.STARTED))
  ) {
    return true;
  }

  if (modelItem.model_type === TRAINED_MODEL_TYPE.LANG_IDENT) {
    return true;
  }

  return false;
}
