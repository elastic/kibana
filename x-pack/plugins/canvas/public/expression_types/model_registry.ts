/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Registry } from '@kbn/interpreter';
import { Model } from './model';
import type { ModelProps, Model as ModelType } from './model';

class ModelRegistry extends Registry<ModelProps, ModelType> {
  wrapper(obj: ModelProps): ModelType {
    return new Model(obj);
  }
}

export const modelRegistry = new ModelRegistry();
