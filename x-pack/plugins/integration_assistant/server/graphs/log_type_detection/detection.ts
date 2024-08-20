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
import type { LogFormatDetectionState } from '../../types';
import { LOG_FORMAT_DETECTION_PROMPT } from './prompts';

export async function handleLogFormatDetection(
  state: LogFormatDetectionState,
  model: ActionsClientChatOpenAI | ActionsClientSimpleChatModel
) {
  const outputParser = new JsonOutputParser();
  const logFormatDetectionNode = LOG_FORMAT_DETECTION_PROMPT.pipe(model).pipe(outputParser);

  const detectedLogFormatAnswer = await logFormatDetectionNode.invoke({
    ex_answer: state.exAnswer,
    log_samples: state.rawSamples,
  });
  const logFormat = detectedLogFormatAnswer.log_type;

  return { logFormat, lastExecutedChain: 'logFormatDetection' };
}
