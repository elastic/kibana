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
import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { LogTypeDetectionState } from '../../types';
import { LOG_TYPE_DETECTION_PROMPT } from './prompts';

export async function handleLogTypeDetection(
  state: LogTypeDetectionState,
  model: ActionsClientChatOpenAI | ActionsClientSimpleChatModel
) {
  const logTypeDetectionPrompt = LOG_TYPE_DETECTION_PROMPT;
  const outputParser = new JsonOutputParser();
  const logTypeDetectionNode = logTypeDetectionPrompt.pipe(model).pipe(outputParser);

  const logTypeJson = await logTypeDetectionNode.invoke({
    ex_answer: state.exAnswer,
    log_samples: state.rawSamples,
  });
  const logType = logTypeJson.log_type;

  return { logType, lastExecutedChain: 'logTypeDetection' };
}
