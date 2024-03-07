/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';

import type { TransformConfigUnion } from '../../../common/types/transform';

export const TRANSFORM_ERROR_TYPE = {
  DANGLING_TASK: 'dangling_task',
} as const;

export const overrideTransformForCloning = (originalConfig: TransformConfigUnion) => {
  // 'Managed' means job is preconfigured and deployed by other solutions
  // we should not clone this setting
  const clonedConfig = cloneDeep(originalConfig);
  delete clonedConfig._meta?.managed;
  return clonedConfig;
};
