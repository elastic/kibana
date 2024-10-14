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
import { SamplesFormat } from '../../../common';

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

  const logFormatDetectionResult = await logFormatDetectionNode.invoke({
    ex_answer: state.exAnswer,
    log_samples: samples,
    package_title: state.packageTitle,
    datastream_title: state.dataStreamTitle,
  });

  let samplesFormat: SamplesFormat = { name: 'unsupported' };

  try {
    samplesFormat = SamplesFormat.parse(logFormatDetectionResult);
    if (samplesFormat.header === undefined) {
      samplesFormat.header = false;
    }
  } catch (error) {
    // If the LLM fails to produce the output of specified format, we will default to unsupported.
  }

  return { samplesFormat, header: samplesFormat.header, lastExecutedChain: 'logFormatDetection' };
}
