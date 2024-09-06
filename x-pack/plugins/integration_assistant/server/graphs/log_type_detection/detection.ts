/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { LogFormatDetectionState } from '../../types';
import { LOG_FORMAT_DETECTION_PROMPT } from './prompts';
import type { LogDetectionNodeParams } from './types';

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

  const detectedLogFormatAnswer = await logFormatDetectionNode.invoke({
    ex_answer: state.exAnswer,
    log_samples: samples,
  });

  const logFormat = detectedLogFormatAnswer.log_type;
  const header = detectedLogFormatAnswer.header;

  return { samplesFormat: { name: logFormat }, header, lastExecutedChain: 'logFormatDetection' };
}
