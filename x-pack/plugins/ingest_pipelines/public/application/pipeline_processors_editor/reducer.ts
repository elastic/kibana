/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Reducer, useReducer } from 'react';
import { euiDragDropReorder } from '@elastic/eui';
import { createPipelineEditorProcessor, DataInResult } from './data_in';
import { PipelineEditorProcessor } from './types';

type State = DataInResult;

type Action =
  | { type: 'addProcessor'; payload: { processor: Omit<PipelineEditorProcessor, 'id'> } }
  | { type: 'updateProcessor'; payload: { processor: PipelineEditorProcessor } }
  | { type: 'removeProcessor'; payload: { processor: PipelineEditorProcessor } }
  | { type: 'reorderProcessors'; payload: { sourceIdx: number; destIdx: number } };

const findProcessorIdx = (
  processors: PipelineEditorProcessor[],
  processor: PipelineEditorProcessor
): number => {
  return processors.findIndex(p => p.id === processor.id);
};

const reducer: Reducer<State, Action> = (state, action) => {
  if (action.type === 'reorderProcessors') {
    const { destIdx, sourceIdx } = action.payload;
    return {
      ...state,
      processors: euiDragDropReorder(state.processors, sourceIdx, destIdx),
    };
  }

  if (action.type === 'removeProcessor') {
    const idx = findProcessorIdx(state.processors, action.payload.processor);
    const copyProcessors = state.processors.slice();
    copyProcessors.splice(idx, 1);
    return {
      ...state,
      processors: copyProcessors,
    };
  }

  if (action.type === 'addProcessor') {
    const { processor: processorArgs } = action.payload;
    const processor = createPipelineEditorProcessor(processorArgs);
    // TODO: For now we just append it to the processor array, this should be a bit more sophisticated
    return {
      ...state,
      processors: state.processors.concat(processor),
    };
  }

  if (action.type === 'updateProcessor') {
    const { processor } = action.payload;
    const idx = findProcessorIdx(state.processors, processor);
    const copyProcessors = state.processors.slice();
    copyProcessors.splice(idx, 1, processor);
    return {
      ...state,
      processors: copyProcessors,
    };
  }

  return state;
};

export const useEditorState = (state: State) => useReducer<typeof reducer>(reducer, state);
