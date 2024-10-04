/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateGraphArgs } from '@langchain/langgraph';
import { StateGraph, END, START } from '@langchain/langgraph';
import { ESProcessorItem } from '../../../common';
import type { KVState } from '../../types';
import { handleKV } from './kv';
import type { KVGraphParams, KVBaseNodeParams } from './types';
import { handleHeader } from './header';
import { handleHeaderError, handleKVError } from './error';
import { handleHeaderValidate, handleKVValidate } from './validate';

const graphState: StateGraphArgs<KVState>['channels'] = {
  lastExecutedChain: {
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
  header: {
    value: (x: boolean, y?: boolean) => y ?? x,
    default: () => false,
  },
  errors: {
    value: (x: object, y?: object) => y ?? x,
    default: () => [],
  },
  kvProcessor: {
    value: (x: ESProcessorItem, y?: ESProcessorItem) => y ?? x,
    default: () => ({ kv: {} }),
  },
  grokPattern: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  additionalProcessors: {
    value: (x: object[], y?: object[]) => y ?? x,
    default: () => [],
  },
  ecsVersion: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
};

function modelInput({ state }: KVBaseNodeParams): Partial<KVState> {
  return {
    finalized: false,
    lastExecutedChain: 'modelInput',
  };
}

function modelOutput({ state }: KVBaseNodeParams): Partial<KVState> {
  return {
    finalized: true,
    additionalProcessors: state.additionalProcessors,
    lastExecutedChain: 'modelOutput',
  };
}

function headerRouter({ state }: KVBaseNodeParams): string {
  if (state.header === true) {
    return 'header';
  }
  return 'noHeader';
}

function kvRouter({ state }: KVBaseNodeParams): string {
  if (Object.keys(state.errors).length === 0) {
    return 'modelOutput';
  }
  return 'handleKVError';
}

function kvHeaderRouter({ state }: KVBaseNodeParams): string {
  if (Object.keys(state.errors).length === 0) {
    return 'handleKV';
  }
  return 'handleHeaderError';
}

export async function getKVGraph({ model, client }: KVGraphParams) {
  const workflow = new StateGraph({
    channels: graphState,
  })
    .addNode('modelInput', (state: KVState) => modelInput({ state }))
    .addNode('modelOutput', (state: KVState) => modelOutput({ state }))
    .addNode('handleHeader', (state: KVState) => handleHeader({ state, model, client }))
    .addNode('handleKVError', (state: KVState) => handleKVError({ state, model, client }))
    .addNode('handleHeaderError', (state: KVState) => handleHeaderError({ state, model, client }))
    .addNode('handleKV', (state: KVState) => handleKV({ state, model, client }))
    .addNode('handleKVValidate', (state: KVState) => handleKVValidate({ state, model, client }))
    .addNode('handleHeaderValidate', (state: KVState) =>
      handleHeaderValidate({ state, model, client })
    )
    .addEdge(START, 'modelInput')
    .addConditionalEdges('modelInput', (state: KVState) => headerRouter({ state }), {
      header: 'handleHeader',
      noHeader: 'handleKV',
    })
    .addEdge('handleHeader', 'handleHeaderValidate')
    .addConditionalEdges('handleHeaderValidate', (state: KVState) => kvHeaderRouter({ state }), {
      handleHeaderError: 'handleHeaderError',
      handleKV: 'handleKV',
    })
    .addEdge('handleHeaderError', 'handleHeaderValidate')
    .addEdge('handleKVError', 'handleKVValidate')
    .addEdge('handleKV', 'handleKVValidate')
    .addConditionalEdges('handleKVValidate', (state: KVState) => kvRouter({ state }), {
      handleKVError: 'handleKVError',
      modelOutput: 'modelOutput',
    })
    .addEdge('modelOutput', END);

  const compiledKVGraph = workflow.compile();
  return compiledKVGraph;
}
