/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundChatCompleteOptions } from '@kbn/inference-common';
import { createScopedChatCompleteAPI } from '../../common/chat_complete';
import { createScopedOutputAPI } from '../../common/output';
import type { InferenceClient, BoundInferenceClient } from './types';

export const createBoundInferenceClient = (
  unboundClient: InferenceClient,
  boundParams: BoundChatCompleteOptions
): BoundInferenceClient => {
  return {
    ...unboundClient,
    chatComplete: createScopedChatCompleteAPI(unboundClient.chatComplete, boundParams),
    output: createScopedOutputAPI(unboundClient.output, boundParams),
  };
};
