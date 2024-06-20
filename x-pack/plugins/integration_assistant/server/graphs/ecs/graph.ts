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
import type { EcsMappingState } from '../../types';
import { mergeSamples, modifySamples } from '../../util/samples';
import { ECS_EXAMPLE_ANSWER, ECS_FIELDS } from './constants';
import { handleDuplicates } from './duplicates';
import { handleInvalidEcs } from './invalid';
import { handleEcsMapping } from './mapping';
import { handleMissingKeys } from './missing';
import { createPipeline } from './pipeline';
import { handleValidateMappings } from './validate';

const graphState: StateGraphArgs<EcsMappingState>['channels'] = {
  ecs: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
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
  formattedSamples: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
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
  currentMapping: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  currentPipeline: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  duplicateFields: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  missingKeys: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  invalidEcsFields: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  results: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  logFormat: {
    value: (x: string, y?: string) => y ?? x,
    default: () => 'json',
  },
  ecsVersion: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '8.11.0',
  },
};

function modelInput(state: EcsMappingState): Partial<EcsMappingState> {
  const samples = modifySamples(state);
  const formattedSamples = mergeSamples(samples);
  return {
    exAnswer: JSON.stringify(ECS_EXAMPLE_ANSWER, null, 2),
    ecs: JSON.stringify(ECS_FIELDS, null, 2),
    samples,
    finalized: false,
    formattedSamples,
    lastExecutedChain: 'modelInput',
  };
}

function modelOutput(state: EcsMappingState): Partial<EcsMappingState> {
  const currentPipeline = createPipeline(state);
  return {
    finalized: true,
    lastExecutedChain: 'modelOutput',
    results: {
      mapping: state.currentMapping,
      pipeline: currentPipeline,
    },
  };
}

function inputRouter(state: EcsMappingState): string {
  if (Object.keys(state.currentMapping).length === 0) {
    return 'ecsMapping';
  }
  return 'modelOutput';
}

function chainRouter(state: EcsMappingState): string {
  if (Object.keys(state.duplicateFields).length > 0) {
    return 'duplicateFields';
  }
  if (Object.keys(state.missingKeys).length > 0) {
    return 'missingKeys';
  }
  if (Object.keys(state.invalidEcsFields).length > 0) {
    return 'invalidEcsFields';
  }
  if (!state.finalized) {
    return 'modelOutput';
  }
  return END;
}

export async function getEcsGraph(model: ActionsClientChatOpenAI | ActionsClientSimpleChatModel) {
  const workflow = new StateGraph({
    channels: graphState,
  })
    .addNode('modelInput', modelInput)
    .addNode('modelOutput', modelOutput)
    .addNode('handleEcsMapping', (state: EcsMappingState) => handleEcsMapping(state, model))
    .addNode('handleValidation', handleValidateMappings)
    .addNode('handleDuplicates', (state: EcsMappingState) => handleDuplicates(state, model))
    .addNode('handleMissingKeys', (state: EcsMappingState) => handleMissingKeys(state, model))
    .addNode('handleInvalidEcs', (state: EcsMappingState) => handleInvalidEcs(state, model))
    .addEdge(START, 'modelInput')
    .addEdge('modelOutput', END)
    .addEdge('handleEcsMapping', 'handleValidation')
    .addEdge('handleDuplicates', 'handleValidation')
    .addEdge('handleMissingKeys', 'handleValidation')
    .addEdge('handleInvalidEcs', 'handleValidation')
    .addConditionalEdges('modelInput', inputRouter, {
      ecsMapping: 'handleEcsMapping',
      modelOutput: 'modelOutput',
    })
    .addConditionalEdges('handleValidation', chainRouter, {
      duplicateFields: 'handleDuplicates',
      missingKeys: 'handleMissingKeys',
      invalidEcsFields: 'handleInvalidEcs',
      modelOutput: 'modelOutput',
    });

  const compiledEcsGraph = workflow.compile();

  return compiledEcsGraph;
}
