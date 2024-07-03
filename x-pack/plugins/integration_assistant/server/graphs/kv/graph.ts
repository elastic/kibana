/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { StateGraphArgs } from '@langchain/langgraph';
import { StateGraph, END, START } from '@langchain/langgraph';
import type {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';
import type { KVState } from '../../types';
import { handleKV } from './kv';
import { handleErrors } from './errors';
import { KV_EXAMPLE_ANSWER } from './constants';

const graphState: StateGraphArgs<KVState>['channels'] = {
  lastExecutedChain: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  rawSamples: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  samples: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  modifiedSamples: {
    value: (x: object[], y?: object[]) => y ?? x,
    default: () => [],
  },
  exAnswer: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  packageName: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  dataStreamName: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  finalized: {
    value: (x: boolean, y?: boolean) => y ?? x,
    default: () => false,
  },
  reviewed: {
    value: (x: boolean, y?: boolean) => y ?? x,
    default: () => false,
  },
  errors: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  results: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  additionalProcessors: {
    value: (x: object[], y?: object[]) => y ?? x,
    default: () => [],
  },
};

function modelInput(state: KVState): Partial<KVState> {
  const rawSamples = state.rawSamples;
  return {
    exAnswer: JSON.stringify(KV_EXAMPLE_ANSWER, null, 2),
    rawSamples,
    finalized: false,
    reviewed: false,
    lastExecutedChain: 'modelInput',
  };
}

function modelOutput(state: KVState): Partial<KVState> {
  return {
    finalized: true,
    lastExecutedChain: 'modelOutput',
    results: {
      docs: state.pipelineResults,
      pipeline: state.currentPipeline,
    },
  };
}

export async function getCategorizationGraph(
  client: IScopedClusterClient,
  model: ActionsClientChatOpenAI | ActionsClientSimpleChatModel
) {
  const workflow = new StateGraph({
    channels: graphState,
  })
    .addNode('modelInput', modelInput)
    .addNode('modelOutput', modelOutput)
    .addNode('handleSamples', handleSamples)
    .addNode('handleKV', (state: KVState) => handleKV(state, model, client))
    .addNode('handleErrors', (state: KVState) => handleErrors(state, model))
    .addEdge(START, 'modelInput')
    .addEdge('modelOutput', END)
    .addEdge('modelInput', 'handleSamples')
    .addEdge('handleKV', 'handleValidatePipeline')
    .addEdge('handleInvalidCategorization', 'handleValidatePipeline')
    .addEdge('handleErrors', 'handleValidatePipeline')
    .addEdge('handleReview', 'handleValidatePipeline')
    .addConditionalEdges('handleValidatePipeline', validationRouter, {
      categorization: 'handleCategorization',
      validateCategorization: 'handleCategorizationValidation',
    })
    .addConditionalEdges('handleCategorizationValidation', chainRouter, {
      modelOutput: 'modelOutput',
      errors: 'handleErrors',
      invalidCategorization: 'handleInvalidCategorization',
      review: 'handleReview',
    });

  const compiledCategorizationGraph = workflow.compile();
  return compiledCategorizationGraph;
}
