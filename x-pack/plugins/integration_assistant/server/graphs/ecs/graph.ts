import { StateGraph, StateGraphArgs, END, START } from '@langchain/langgraph';
import { ECS_EXAMPLE_ANSWER, ECS_FIELDS } from './constants';
import { modifySamples, mergeSamples } from '../../util/samples';
import { createPipeline } from './pipeline';
import { handleEcsMapping } from './mapping';
import { handleDuplicates } from './duplicates';
import { handleMissingKeys } from './missing';
import { handleInvalidEcs } from './invalid';
import { handleValidateMappings } from './validate';
import { EcsMappingState } from '../../types';

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
      current_pipeline: currentPipeline,
    },
  };
}

function inputRouter(state: EcsMappingState): string {
  if (Object.keys(state.currentMapping).length === 0) {
    console.log('No current mapping found');
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

export function getEcsGraph() {
  const workflow = new StateGraph({
    channels: graphState,
  })
    .addNode('modelInput', modelInput)
    .addNode('modelOutput', modelOutput)
    .addNode('handleEcsMapping', handleEcsMapping)
    .addNode('handleValidation', handleValidateMappings)
    .addNode('handleDuplicates', handleDuplicates)
    .addNode('handleMissingKeys', handleMissingKeys)
    .addNode('handleInvalidEcs', handleInvalidEcs)
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
