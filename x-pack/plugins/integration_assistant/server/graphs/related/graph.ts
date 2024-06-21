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
import type { RelatedState } from '../../types';
import { modifySamples, formatSamples } from '../../util/samples';
import { handleValidatePipeline } from '../../util/graph';
import { handleRelated } from './related';
import { handleErrors } from './errors';
import { handleReview } from './review';
import { RELATED_ECS_FIELDS, RELATED_EXAMPLE_ANSWER } from './constants';

const graphState: StateGraphArgs<RelatedState>['channels'] = {
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
  ecs: {
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
  pipelineResults: {
    value: (x: object[], y?: object[]) => y ?? x,
    default: () => [],
  },
  currentPipeline: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
  },
  currentProcessors: {
    value: (x: object[], y?: object[]) => y ?? x,
    default: () => [],
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

function modelInput(state: RelatedState): Partial<RelatedState> {
  const samples = modifySamples(state);
  const formattedSamples = formatSamples(samples);
  const initialPipeline = JSON.parse(JSON.stringify(state.currentPipeline));
  return {
    exAnswer: JSON.stringify(RELATED_EXAMPLE_ANSWER, null, 2),
    ecs: JSON.stringify(RELATED_ECS_FIELDS, null, 2),
    samples,
    formattedSamples,
    initialPipeline,
    finalized: false,
    reviewed: false,
    lastExecutedChain: 'modelInput',
  };
}

function modelOutput(state: RelatedState): Partial<RelatedState> {
  return {
    finalized: true,
    lastExecutedChain: 'modelOutput',
    results: {
      docs: state.pipelineResults,
      pipeline: state.currentPipeline,
    },
  };
}

function inputRouter(state: RelatedState): string {
  if (Object.keys(state.pipelineResults).length === 0) {
    return 'validatePipeline';
  }
  return 'related';
}

function chainRouter(state: RelatedState): string {
  if (Object.keys(state.currentProcessors).length === 0) {
    return 'related';
  }
  if (Object.keys(state.errors).length > 0) {
    return 'errors';
  }
  if (!state.reviewed) {
    return 'review';
  }
  if (!state.finalized) {
    return 'modelOutput';
  }
  return END;
}

export async function getRelatedGraph(
  client: IScopedClusterClient,
  model: ActionsClientChatOpenAI | ActionsClientSimpleChatModel
) {
  const workflow = new StateGraph({ channels: graphState })
    .addNode('modelInput', modelInput)
    .addNode('modelOutput', modelOutput)
    .addNode('handleRelated', (state: RelatedState) => handleRelated(state, model))
    .addNode('handleValidatePipeline', (state: RelatedState) =>
      handleValidatePipeline(state, client)
    )
    .addNode('handleErrors', (state: RelatedState) => handleErrors(state, model))
    .addNode('handleReview', (state: RelatedState) => handleReview(state, model))
    .addEdge(START, 'modelInput')
    .addEdge('modelOutput', END)
    .addEdge('handleRelated', 'handleValidatePipeline')
    .addEdge('handleErrors', 'handleValidatePipeline')
    .addEdge('handleReview', 'handleValidatePipeline')
    .addConditionalEdges('modelInput', inputRouter, {
      related: 'handleRelated',
      validatePipeline: 'handleValidatePipeline',
    })
    .addConditionalEdges('handleValidatePipeline', chainRouter, {
      related: 'handleRelated',
      errors: 'handleErrors',
      review: 'handleReview',
      modelOutput: 'modelOutput',
    });

  const compiledRelatedGraph = workflow.compile();
  return compiledRelatedGraph;
}
