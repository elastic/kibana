import { StateGraph, StateGraphArgs, END, START } from '@langchain/langgraph';
import { RelatedState } from '../../types';
import { modifySamples, formatSamples } from '../../util/samples';
import { handleValidatePipeline } from '../../util/es';
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
  currentMapping: {
    value: (x: object, y?: object) => y ?? x,
    default: () => ({}),
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
    console.log('No pipeline results found');
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

export function getRelatedGraph() {
  const workflow = new StateGraph({ channels: graphState })
    .addNode('modelInput', modelInput)
    .addNode('modelOutput', modelOutput)
    .addNode('handleRelated', handleRelated)
    .addNode('handleValidatePipeline', handleValidatePipeline)
    .addNode('handleErrors', handleErrors)
    .addNode('handleReview', handleReview)
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
