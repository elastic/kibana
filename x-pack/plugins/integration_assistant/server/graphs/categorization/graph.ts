/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateGraphArgs } from '@langchain/langgraph';
import { END, START, StateGraph } from '@langchain/langgraph';
import type { CategorizationState } from '../../types';
import { handleValidatePipeline } from '../../util/graph';
import { formatSamples, prefixSamples } from '../../util/samples';
import { handleCategorization } from './categorization';
import { CATEGORIZATION_EXAMPLE_ANSWER, ECS_CATEGORIES, ECS_TYPES } from './constants';
import { handleErrors } from './errors';
import { handleInvalidCategorization } from './invalid';
import { handleReview } from './review';
import type { CategorizationBaseNodeParams, CategorizationGraphParams } from './types';
import { handleCategorizationValidation } from './validate';

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
  hasTriedOnce: {
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

function modelInput({ state }: CategorizationBaseNodeParams): Partial<CategorizationState> {
  const samples = prefixSamples(state);
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

function modelOutput({ state }: CategorizationBaseNodeParams): Partial<CategorizationState> {
  return {
    finalized: true,
    lastExecutedChain: 'modelOutput',
    results: {
      docs: state.pipelineResults,
      pipeline: state.currentPipeline,
    },
  };
}

function validationRouter({ state }: CategorizationBaseNodeParams): string {
  if (Object.keys(state.currentProcessors).length === 0) {
    if (state.hasTriedOnce || state.reviewed) {
      return 'modelOutput';
    }
    return 'categorization';
  }
  return 'validateCategorization';
}

function chainRouter({ state }: CategorizationBaseNodeParams): string {
  if (Object.keys(state.currentProcessors).length === 0) {
    if (state.hasTriedOnce || state.reviewed) {
      return 'modelOutput';
    }
  }
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

export async function getCategorizationGraph({ client, model }: CategorizationGraphParams) {
  const workflow = new StateGraph({
    channels: graphState,
  })
    .addNode('modelInput', (state: CategorizationState) => modelInput({ state }))
    .addNode('modelOutput', (state: CategorizationState) => modelOutput({ state }))
    .addNode('handleCategorization', (state: CategorizationState) =>
      handleCategorization({ state, model })
    )
    .addNode('handleValidatePipeline', (state: CategorizationState) =>
      handleValidatePipeline({ state, client })
    )
    .addNode('handleCategorizationValidation', (state: CategorizationState) =>
      handleCategorizationValidation({ state })
    )
    .addNode('handleInvalidCategorization', (state: CategorizationState) =>
      handleInvalidCategorization({ state, model })
    )
    .addNode('handleErrors', (state: CategorizationState) => handleErrors({ state, model }))
    .addNode('handleReview', (state: CategorizationState) => handleReview({ state, model }))
    .addEdge(START, 'modelInput')
    .addEdge('modelOutput', END)
    .addEdge('modelInput', 'handleValidatePipeline')
    .addEdge('handleCategorization', 'handleValidatePipeline')
    .addEdge('handleInvalidCategorization', 'handleValidatePipeline')
    .addEdge('handleErrors', 'handleValidatePipeline')
    .addEdge('handleReview', 'handleValidatePipeline')
    .addConditionalEdges(
      'handleValidatePipeline',
      (state: CategorizationState) => validationRouter({ state }),
      {
        modelOutput: 'modelOutput',
        categorization: 'handleCategorization',
        validateCategorization: 'handleCategorizationValidation',
      }
    )
    .addConditionalEdges(
      'handleCategorizationValidation',
      (state: CategorizationState) => chainRouter({ state }),
      {
        modelOutput: 'modelOutput',
        errors: 'handleErrors',
        invalidCategorization: 'handleInvalidCategorization',
        review: 'handleReview',
      }
    );

  const compiledCategorizationGraph = workflow.compile();
  return compiledCategorizationGraph;
}
