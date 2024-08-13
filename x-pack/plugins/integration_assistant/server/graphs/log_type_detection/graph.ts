/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';
import type { StateGraphArgs } from '@langchain/langgraph';
import { END, START, StateGraph } from '@langchain/langgraph';
import type { LogTypeDetectionState } from '../../types';
import { LOG_TYPE_JSON } from './constants';
import { LogType } from '../../constants';
import { handleLogTypeDetection } from './detection';

const graphState: StateGraphArgs<LogTypeDetectionState>['channels'] = {
  lastExecutedChain: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  rawSamples: {
    value: (x: string[], y?: string[]) => y ?? x,
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
  logType: {
    value: (x: LogType, y?: LogType) => y ?? x,
    default: () => LogType.JSON,
  },
  ecsVersion: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '8.11.0',
  },
};

function modelInput(state: LogTypeDetectionState): Partial<LogTypeDetectionState> {
  return {
    exAnswer: JSON.stringify(LOG_TYPE_JSON, null, 2),
    finalized: false,
    lastExecutedChain: 'modelInput',
  };
}

function modelOutput(state: LogTypeDetectionState): Partial<LogTypeDetectionState> {
  return {
    finalized: true,
    lastExecutedChain: 'modelOutput',
  };
}

function logTypeRouter(state: LogTypeDetectionState): string {
  // if (state.logType === LogType.STRUCTURED) {
  //   return 'structured';
  // }
  // if (state.logType === LogType.UNSTRUCTURED) {
  //   return 'unstructured';
  // }
  // if (state.logType === LogType.CSV) {
  //   return 'csv';
  // }
  return 'unsupported';
}

export async function getLogTypeDetectionGraph(
  model: ActionsClientChatOpenAI | ActionsClientSimpleChatModel
) {
  const workflow = new StateGraph({
    channels: graphState,
  })
    .addNode('modelInput', modelInput)
    .addNode('modelOutput', modelOutput)
    .addNode('handleLogTypeDetection', (state: LogTypeDetectionState) =>
      handleLogTypeDetection(state, model)
    )
    // .addNode('handleKVGraph', (state: LogTypeDetectionState) => getCompiledKvGraph(state, model))
    // .addNode('handleUnstructuredGraph', (state: LogTypeDetectionState) => getCompiledUnstructuredGraph(state, model))
    // .addNode('handleCsvGraph', (state: LogTypeDetectionState) => getCompiledCsvGraph(state, model))
    .addEdge(START, 'modelInput')
    .addEdge('modelInput', 'handleLogTypeDetection')
    .addEdge('modelOutput', END)
    .addConditionalEdges('handleLogTypeDetection', logTypeRouter, {
      // TODO: Add structured, unstructured, csv nodes
      // structured: 'handleKVGraph',
      // unstructured: 'handleUnstructuredGraph',
      // csv: 'handleCsvGraph',
      unsupported: 'modelOutput',
    });

  const compiledLogTypeDetectionGraph = workflow.compile();

  return compiledLogTypeDetectionGraph;
}
