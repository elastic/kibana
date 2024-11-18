/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  OutputAPI,
  OutputOptions,
  BoundOutputAPI,
  StaticOutputOptions,
  DynamicOutputOptions,
  ToolSchema,
} from '@kbn/inference-common';

export function createScopedOutputAPI(
  chatComplete: OutputAPI,
  boundParams: StaticOutputOptions
): BoundOutputAPI;
export function createScopedOutputAPI(chatComplete: OutputAPI, boundParams: StaticOutputOptions) {
  return (dynamicParams: DynamicOutputOptions<string, ToolSchema, boolean>) => {
    const params: OutputOptions<string, ToolSchema, boolean> = {
      ...boundParams,
      ...dynamicParams,
    };
    return chatComplete(params);
  };
}
