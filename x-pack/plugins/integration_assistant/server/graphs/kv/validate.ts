/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { ESProcessorItem } from '../../../common';
import type { KVState } from '../../types';
import type { HandleKVNodeParams } from './types';
import { testPipeline } from '../../util';
import { onFailure } from './constants';
import { createGrokProcessor } from '../../util/processors';

interface KVResult {
  [packageName: string]: { [dataStreamName: string]: unknown };
}

interface GrokResult {
  [key: string]: unknown;
  message: string;
}

export async function handleKVValidate({
  state,
  client,
}: HandleKVNodeParams): Promise<Partial<KVState>> {
  const kvProcessor = state.kvProcessor;
  const packageName = state.packageName;
  const dataStreamName = state.dataStreamName;

  // Pick logSamples if there was no header detected.
  const samples = state.header ? state.kvLogMessages : state.logSamples;

  const { pipelineResults: kvOutputSamples, errors } = (await createJSONInput(
    kvProcessor,
    samples,
    client,
    state
  )) as { pipelineResults: KVResult[]; errors: object[] };

  if (errors.length > 0) {
    return { errors, lastExecutedChain: 'kvValidate' };
  }

  // Converts JSON Object into a string and parses it as a array of JSON strings
  const jsonSamples = kvOutputSamples
    .map((log) => log[packageName])
    .map((log) => log[dataStreamName])
    .map((log) => JSON.stringify(log));
  const additionalProcessors = state.additionalProcessors;
  additionalProcessors.push(kvProcessor[0]);

  return {
    jsonSamples,
    additionalProcessors,
    errors: [],
    lastExecutedChain: 'kvValidate',
  };
}

export async function handleHeaderValidate({
  state,
  client,
}: HandleKVNodeParams): Promise<Partial<KVState>> {
  const grokPattern = state.grokPattern;
  const grokProcessor = createGrokProcessor([grokPattern]);
  const pipeline = { processors: grokProcessor, on_failure: [onFailure] };

  const { pipelineResults, errors } = (await testPipeline(state.logSamples, pipeline, client)) as {
    pipelineResults: GrokResult[];
    errors: object[];
  };

  if (errors.length > 0) {
    return { errors, lastExecutedChain: 'kv_header_validate' };
  }

  const kvLogMessages: string[] = pipelineResults.map((entry) => entry.message);
  const additionalProcessors = state.additionalProcessors;
  additionalProcessors.push(grokProcessor[0]);

  return {
    kvLogMessages,
    additionalProcessors,
    errors: [],
    lastExecutedChain: 'kv_header_validate',
  };
}

async function createJSONInput(
  kvProcessor: ESProcessorItem,
  formattedSamples: string[],
  client: IScopedClusterClient,
  state: KVState
): Promise<{ pipelineResults: object[]; errors: object[] }> {
  // This processor removes the original message field in the JSON output
  const removeProcessor = { remove: { field: 'message', ignore_missing: true } };
  const pipeline = { processors: [kvProcessor[0], removeProcessor], on_failure: [onFailure] };
  const { pipelineResults, errors } = await testPipeline(formattedSamples, pipeline, client);
  return { pipelineResults, errors };
}
