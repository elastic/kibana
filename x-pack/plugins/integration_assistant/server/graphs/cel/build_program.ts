/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StringOutputParser } from '@langchain/core/output_parsers';
import { CelInputState } from '../../types';
import { EX_ANSWER_PROGRAM, SAMPLE_CEL_PROGRAMS } from './constants';
import { CEL_BASE_PROGRAM_PROMPT } from './prompts';
import { CelInputNodeParams } from './types';

export async function handleBuildProgram({
  state,
  model,
}: CelInputNodeParams): Promise<Partial<CelInputState>> {
  const outputParser = new StringOutputParser();
  const celProgramGraph = CEL_BASE_PROGRAM_PROMPT.pipe(model).pipe(outputParser);

  const program = await celProgramGraph.invoke({
    data_stream_name: state.dataStreamName,
    example_cel_programs: SAMPLE_CEL_PROGRAMS,
    open_api_spec: state.apiDefinition,
    api_query_summary: state.apiQuerySummary,
    ex_answer: EX_ANSWER_PROGRAM,
  });
  const validateCelTask = state.validateCelTask;

  console.log(`Start time: ${Date.now()}`);
  console.log('Before validate run Task: ', process.memoryUsage());
  const taskInstance = await validateCelTask.validateCelProgram(program.trim());
  const formattedProgram = await validateCelTask.pollTaskManager(taskInstance);
  console.log('After validate run Task: ', process.memoryUsage());
  console.log(`End time: ${Date.now()}`);

  return {
    currentProgram: formattedProgram,
    lastExecutedChain: 'buildCelProgram',
  };
}
