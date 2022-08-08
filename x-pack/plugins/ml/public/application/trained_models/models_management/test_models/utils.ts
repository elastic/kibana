/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import {
  TRAINED_MODEL_TYPE,
  DEPLOYMENT_STATE,
  SUPPORTED_PYTORCH_TASKS,
} from '../../../../../common/constants/trained_models';
import type { SupportedPytorchTasksType } from '../../../../../common/constants/trained_models';
import type { ModelItem } from '../models_list';

const PYTORCH_TYPES = Object.values(SUPPORTED_PYTORCH_TASKS);

export function isTestable(modelItem: ModelItem) {
  if (
    modelItem.model_type === TRAINED_MODEL_TYPE.PYTORCH &&
    PYTORCH_TYPES.includes(Object.keys(modelItem.inference_config)[0] as SupportedPytorchTasksType)
  ) {
    return true;
  }

  if (modelItem.model_type === TRAINED_MODEL_TYPE.LANG_IDENT) {
    return true;
  }

  return false;
}

export function isTestEnabled(modelItem: ModelItem) {
  return (
    isPopulatedObject(modelItem.stats?.deployment_stats) === false ||
    (isPopulatedObject(modelItem.stats?.deployment_stats) &&
      modelItem.stats?.deployment_stats?.state === DEPLOYMENT_STATE.STARTED)
  );
}
