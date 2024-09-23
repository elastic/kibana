/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { GraphRecursionError } from '@langchain/langgraph';
import type { LogFormatDetectionState } from '../../types';
import { LOG_FORMAT_DETECTION_PROMPT } from './prompts';
import type { LogDetectionNodeParams } from './types';
import { RecursionLimitError } from '../../lib/errors';

const MaxLogSamplesInPrompt = 5;

export async function handleLogFormatDetection({
  state,
  model,
}: LogDetectionNodeParams): Promise<Partial<LogFormatDetectionState>> {
  const outputParser = new JsonOutputParser();
  const logFormatDetectionNode = LOG_FORMAT_DETECTION_PROMPT.pipe(model).pipe(outputParser);

  const samples =
    state.logSamples.length > MaxLogSamplesInPrompt
      ? state.logSamples.slice(0, MaxLogSamplesInPrompt)
      : state.logSamples;
  let detectedLogFormatAnswer;

  try {
    detectedLogFormatAnswer = await logFormatDetectionNode.invoke({
      ex_answer: state.exAnswer,
      log_samples: samples,
    });
  } catch (e) {
    if (e instanceof GraphRecursionError) {
      throw new RecursionLimitError(e.message);
    } else {
      throw e;
    }
  }
  const logFormat = detectedLogFormatAnswer.log_type;
  const header = detectedLogFormatAnswer.header;

  return { samplesFormat: { name: logFormat }, header, lastExecutedChain: 'logFormatDetection' };
}
