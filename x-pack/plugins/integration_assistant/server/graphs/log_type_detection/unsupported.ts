/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';
import type { LogTypeDetectionState } from '../../types';

export async function handleUnsupported(
  state: LogTypeDetectionState,
  model: ActionsClientChatOpenAI | ActionsClientSimpleChatModel
) {
  const error = new Error('Unsupported log type');
  return { error, lastExecutedChain: 'unsupported' };
}
