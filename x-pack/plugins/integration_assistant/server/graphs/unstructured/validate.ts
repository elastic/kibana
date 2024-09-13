/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnstructuredLogState } from '../../types';
import type { GrokResult, HandleUnstructuredNodeParams } from './types';
import { testPipeline } from '../../util';
import { onFailure } from './constants';
import { createGrokProcessor } from '../../util/processors';

export async function handleUnstructuredValidate({
  state,
  client,
}: HandleUnstructuredNodeParams): Promise<Partial<UnstructuredLogState>> {
  const grokPatterns = state.grokPatterns;
  const grokProcessor = createGrokProcessor(grokPatterns);
  const pipeline = { processors: grokProcessor, on_failure: [onFailure] };

  const { pipelineResults, errors } = (await testPipeline(state.logSamples, pipeline, client)) as {
    pipelineResults: GrokResult[];
    errors: object[];
  };

  if (errors.length > 0) {
    return { errors, lastExecutedChain: 'unstructured_validate' };
  }

  const jsonSamples: string[] = pipelineResults.map((entry) => JSON.stringify(entry));
  const additionalProcessors = state.additionalProcessors;
  additionalProcessors.push(grokProcessor[0]);

  return {
    jsonSamples,
    additionalProcessors,
    errors: [],
    lastExecutedChain: 'unstructured_validate',
  };
}
