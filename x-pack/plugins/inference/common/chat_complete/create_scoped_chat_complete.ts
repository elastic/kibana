/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChatCompleteAPI,
  ChatCompleteOptions,
  BoundChatCompleteAPI,
  StaticChatCompleteOptions,
  DynamicChatCompleteOptions,
  ToolOptions,
} from '@kbn/inference-common';

export function createScopedChatCompleteAPI(
  chatComplete: ChatCompleteAPI,
  boundParams: StaticChatCompleteOptions
): BoundChatCompleteAPI;
export function createScopedChatCompleteAPI(
  chatComplete: ChatCompleteAPI,
  boundParams: StaticChatCompleteOptions
) {
  return (dynamicParams: DynamicChatCompleteOptions<ToolOptions, boolean>) => {
    const params: ChatCompleteOptions<ToolOptions, boolean> = {
      ...boundParams,
      ...dynamicParams,
    };
    return chatComplete(params);
  };
}
