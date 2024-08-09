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
import type { CategorizationState } from '../../types';
import { modifySamples, formatSamples } from '../../util/samples';
import { handleCategorization } from './categorization';
import { handleValidatePipeline } from '../../util/graph';
import { handleCategorizationValidation } from './validate';
import { handleInvalidCategorization } from './invalid';
import { handleErrors } from './errors';
import { handleReview } from './review';
import { CATEGORIZATION_EXAMPLE_ANSWER, ECS_CATEGORIES, ECS_TYPES } from './constants';

const graphState: StateGraphArgs<CategorizationState>['channels'] = {
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
  ecsTypes: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  ecsCategories: {
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
  reviewed: {
    value: (x: boolean, y?: boolean) => y ?? x,
    default: () => false,
  },
  errors: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  previousError: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  pipelineResults: {
    value: (x: object[], y?: object[]) => y ?? x,
    default: () => [{}],
  },
  currentPipeline: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  currentProcessors: {
    value: (x: object[], y?: object[]) => y ?? x,
    default: () => [],
  },
  invalidCategorization: {
    value: (x: object[], y?: object[]) => y ?? x,
    default: () => [],
  },
  previousInvalidCategorization: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  initialPipeline: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  results: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
};

function modelInput(state: CategorizationState): Partial<CategorizationState> {
  const samples = modifySamples(state);
  const formattedSamples = formatSamples(samples);
  const initialPipeline = JSON.parse(JSON.stringify(state.currentPipeline));
  return {
    exAnswer: JSON.stringify(CATEGORIZATION_EXAMPLE_ANSWER, null, 2),
    ecsCategories: JSON.stringify(ECS_CATEGORIES, null, 2),
    ecsTypes: JSON.stringify(ECS_TYPES, null, 2),
    samples,
    formattedSamples,
    initialPipeline,
    finalized: false,
    reviewed: false,
    lastExecutedChain: 'modelInput',
  };
}

function modelOutput(state: CategorizationState): Partial<CategorizationState> {
  return {
    finalized: true,
    lastExecutedChain: 'modelOutput',
    results: {
      docs: state.pipelineResults,
      pipeline: state.currentPipeline,
    },
  };
}

function validationRouter(state: CategorizationState): string {
  if (Object.keys(state.currentProcessors).length === 0) {
    return 'categorization';
  }
  return 'validateCategorization';
}

function chainRouter(state: CategorizationState): string {
  if (Object.keys(state.errors).length > 0) {
    return 'errors';
  }
  if (Object.keys(state.invalidCategorization).length > 0) {
    return 'invalidCategorization';
  }
  if (!state.reviewed) {
    return 'review';
  }
  if (!state.finalized) {
    return 'modelOutput';
  }

  return END;
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
    .addNode('handleCategorization', (state: CategorizationState) =>
      handleCategorization(state, model)
    )
    .addNode('handleValidatePipeline', (state: CategorizationState) =>
      handleValidatePipeline(state, client)
    )
    .addNode('handleCategorizationValidation', handleCategorizationValidation)
    .addNode('handleInvalidCategorization', (state: CategorizationState) =>
      handleInvalidCategorization(state, model)
    )
    .addNode('handleErrors', (state: CategorizationState) => handleErrors(state, model))
    .addNode('handleReview', (state: CategorizationState) => handleReview(state, model))
    .addEdge(START, 'modelInput')
    .addEdge('modelOutput', END)
    .addEdge('modelInput', 'handleValidatePipeline')
    .addEdge('handleCategorization', 'handleValidatePipeline')
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
