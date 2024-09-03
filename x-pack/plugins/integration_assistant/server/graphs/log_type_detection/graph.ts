/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateGraphArgs } from '@langchain/langgraph';
import { END, START, StateGraph } from '@langchain/langgraph';
import { SamplesFormat } from '../../../common';
import type { LogFormatDetectionState } from '../../types';
import { EX_ANSWER_LOG_TYPE } from './constants';
import { handleLogFormatDetection } from './detection';
import type { LogDetectionBaseNodeParams, LogDetectionGraphParams } from './types';

const graphState: StateGraphArgs<LogFormatDetectionState>['channels'] = {
  lastExecutedChain: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  logSamples: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  exAnswer: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  finalized: {
    value: (x: boolean, y?: boolean) => y ?? x,
    default: () => false,
  },
  samplesFormat: {
    value: (x: SamplesFormat, y?: SamplesFormat) => y ?? x,
    default: () => ({ name: 'unsupported' }),
  },
  ecsVersion: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '8.11.0',
  },
  results: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
};

function modelInput({ state }: LogDetectionBaseNodeParams): Partial<LogFormatDetectionState> {
  return {
    exAnswer: JSON.stringify(EX_ANSWER_LOG_TYPE, null, 2),
    finalized: false,
    lastExecutedChain: 'modelInput',
  };
}

function modelOutput({ state }: LogDetectionBaseNodeParams): Partial<LogFormatDetectionState> {
  return {
    finalized: true,
    lastExecutedChain: 'modelOutput',
    results: {
      samplesFormat: state.samplesFormat,
      parsedSamples: state.logSamples, // TODO: Add parsed samples
    },
  };
}

function logFormatRouter({ state }: LogDetectionBaseNodeParams): string {
  // if (state.samplesFormat === LogFormat.STRUCTURED) {
  //   return 'structured';
  // }
  // if (state.samplesFormat === LogFormat.UNSTRUCTURED) {
  //   return 'unstructured';
  // }
  // if (state.samplesFormat === LogFormat.CSV) {
  //   return 'csv';
  // }
  return 'unsupported';
}

export async function getLogFormatDetectionGraph({ model }: LogDetectionGraphParams) {
  const workflow = new StateGraph({
    channels: graphState,
  })
    .addNode('modelInput', (state: LogFormatDetectionState) => modelInput({ state }))
    .addNode('modelOutput', (state: LogFormatDetectionState) => modelOutput({ state }))
    .addNode('handleLogFormatDetection', (state: LogFormatDetectionState) =>
      handleLogFormatDetection({ state, model })
    )
    // .addNode('handleKVGraph', (state: LogFormatDetectionState) => getCompiledKvGraph({state, model}))
    // .addNode('handleUnstructuredGraph', (state: LogFormatDetectionState) => getCompiledUnstructuredGraph({state, model}))
    // .addNode('handleCsvGraph', (state: LogFormatDetectionState) => getCompiledCsvGraph({state, model}))
    .addEdge(START, 'modelInput')
    .addEdge('modelInput', 'handleLogFormatDetection')
    .addEdge('modelOutput', END)
    .addConditionalEdges(
      'handleLogFormatDetection',
      (state: LogFormatDetectionState) => logFormatRouter({ state }),
      {
        // TODO: Add structured, unstructured, csv nodes
        // structured: 'handleKVGraph',
        // unstructured: 'handleUnstructuredGraph',
        // csv: 'handleCsvGraph',
        unsupported: 'modelOutput',
      }
    );

  const compiledLogFormatDetectionGraph = workflow.compile();

  return compiledLogFormatDetectionGraph;
}
