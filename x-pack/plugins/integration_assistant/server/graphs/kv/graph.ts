/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateGraphArgs } from '@langchain/langgraph';
import { StateGraph, END, START } from '@langchain/langgraph';
import type { KVState } from '../../types';
import { handleKV } from './kv';
import type { KVGraphParams, KVBaseNodeParams } from './types';
import {handleHeader} from './header';


const graphState: StateGraphArgs<KVState>['channels'] = {
  lastExecutedChain: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  logSamples: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  kvLogMessages: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  jsonSamples: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  finalized: {
    value: (x: boolean, y?: boolean) => y ?? x,
    default: () => false,
  },
  additionalProcessors: {
    value: (x: object[], y?: object[]) => y ?? x,
    default: () => [],
  },
};

function modelInput({state}: KVBaseNodeParams): Partial<KVState> {
  return {
    finalized: false,
    lastExecutedChain: 'modelInput',
  };
}

function modelOutput({state}: KVBaseNodeParams): Partial<KVState> {
  return {
    finalized: true,
    lastExecutedChain: 'modelOutput',
  };
}

export async function getKVGraph({model, client}: KVGraphParams) {
  const workflow = new StateGraph({
    channels: graphState,
  })
    .addNode('modelInput', modelInput)
    .addNode('modelOutput', modelOutput)
    .addNode('handleHeader', (state: KVState) => handleHeader({state, model, client}))
    .addNode('handleKV', (state: KVState) => handleKV({state, model, client}))
    .addEdge(START, 'modelInput')
    .addEdge('modelInput', 'handleHeader')
    .addEdge('handleHeader', 'handleKV')
    .addEdge('handleKV', 'modelOutput')
    .addEdge('modelOutput', END);

  const compiledCategorizationGraph = workflow.compile();
  return compiledCategorizationGraph;
}
