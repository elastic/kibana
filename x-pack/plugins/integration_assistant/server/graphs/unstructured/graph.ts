/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateGraphArgs } from '@langchain/langgraph';
import { StateGraph, END, START } from '@langchain/langgraph';
import type { UnstructuredLogState } from '../../types';
import { handleUnstructured } from './unstructured';
import type { UnstructuredGraphParams, UnstructuredBaseNodeParams } from './types';
import { handleUnstructuredError } from './error';
import { handleUnstructuredValidate } from './validate';

const graphState: StateGraphArgs<UnstructuredLogState>['channels'] = {
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
  grokPatterns: {
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
  errors: {
    value: (x: object, y?: object) => y ?? x,
    default: () => [],
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

function modelInput({ state }: UnstructuredBaseNodeParams): Partial<UnstructuredLogState> {
  return {
    finalized: false,
    lastExecutedChain: 'modelInput',
  };
}

function modelOutput({ state }: UnstructuredBaseNodeParams): Partial<UnstructuredLogState> {
  return {
    finalized: true,
    additionalProcessors: state.additionalProcessors,
    lastExecutedChain: 'modelOutput',
  };
}

function validationRouter({ state }: UnstructuredBaseNodeParams): string {
  if (Object.keys(state.errors).length === 0) {
    return 'modelOutput';
  }
  return 'handleUnstructuredError';
}

export async function getUnstructuredGraph({ model, client }: UnstructuredGraphParams) {
  const workflow = new StateGraph({
    channels: graphState,
  })
    .addNode('modelInput', (state: UnstructuredLogState) => modelInput({ state }))
    .addNode('modelOutput', (state: UnstructuredLogState) => modelOutput({ state }))
    .addNode('handleUnstructuredError', (state: UnstructuredLogState) =>
      handleUnstructuredError({ state, model, client })
    )
    .addNode('handleUnstructured', (state: UnstructuredLogState) =>
      handleUnstructured({ state, model, client })
    )
    .addNode('handleUnstructuredValidate', (state: UnstructuredLogState) =>
      handleUnstructuredValidate({ state, model, client })
    )
    .addEdge(START, 'modelInput')
    .addEdge('modelInput', 'handleUnstructured')
    .addEdge('handleUnstructured', 'handleUnstructuredValidate')
    .addConditionalEdges(
      'handleUnstructuredValidate',
      (state: UnstructuredLogState) => validationRouter({ state }),
      {
        handleUnstructuredError: 'handleUnstructuredError',
        modelOutput: 'modelOutput',
      }
    )
    .addEdge('handleUnstructuredError', 'handleUnstructuredValidate')
    .addEdge('modelOutput', END);

  const compiledUnstructuredGraph = workflow.compile();
  return compiledUnstructuredGraph;
}
