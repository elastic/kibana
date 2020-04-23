/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Reducer, useReducer } from 'react';
import { euiDragDropReorder } from '@elastic/eui';

import { OnFormUpdateArg } from '../../../shared_imports';

import { createProcessorInternal, DeserializeResult } from './data_in';
import { getValue, setValue } from './utils';
import { ProcessorInternal, DraggableLocation } from './types';

type StateArg = DeserializeResult;

interface State extends StateArg {
  isValid?: boolean;
  validate: () => Promise<boolean>;
}

type Action =
  | { type: 'addProcessor'; payload: { processor: Omit<ProcessorInternal, 'id'> } }
  | { type: 'updateProcessor'; payload: { processor: ProcessorInternal } }
  | { type: 'removeProcessor'; payload: { processor: ProcessorInternal } }
  | {
      type: 'moveProcessor';
      payload: { source: DraggableLocation; destination: DraggableLocation };
    }
  | { type: 'processorForm.update'; payload: OnFormUpdateArg<any> }
  | { type: 'processorForm.close' };

const findProcessorIdx = (
  processors: ProcessorInternal[],
  processor: ProcessorInternal
): number => {
  return processors.findIndex(p => p.id === processor.id);
};

export const reducer: Reducer<State, Action> = (state, action) => {
  if (action.type === 'moveProcessor') {
    const { destination, source } = action.payload;
    if (destination.pathSelector === source.pathSelector) {
      if (source.pathSelector === undefined) {
        return {
          ...state,
          processors: euiDragDropReorder(state.processors, source.index, destination.index),
        };
      } else {
        const path = source.pathSelector.split('.');
        const processors = getValue<ProcessorInternal[]>(path, state.processors);
        return {
          ...state,
          processors: setValue(
            path,
            state.processors,
            euiDragDropReorder(processors, source.index, destination.index)
          ),
        };
      }
    } else {
      return state;
    }
  }

  if (action.type === 'removeProcessor') {
    const idx = findProcessorIdx(state.processors, action.payload.processor);
    const processorsCopy = state.processors.slice();
    processorsCopy.splice(idx, 1);
    return {
      ...state,
      processors: processorsCopy,
    };
  }

  if (action.type === 'addProcessor') {
    const { processor: processorArgs } = action.payload;
    const processor = createProcessorInternal(processorArgs);
    // TODO: For now we just append it to the processor array, this should be a bit more sophisticated
    return {
      ...state,
      processors: state.processors.concat(processor),
    };
  }

  if (action.type === 'updateProcessor') {
    const { processor } = action.payload;
    const idx = findProcessorIdx(state.processors, processor);
    const processorsCopy = state.processors.slice();
    processorsCopy.splice(idx, 1, processor);
    return {
      ...state,
      processors: processorsCopy,
    };
  }

  if (action.type === 'processorForm.update') {
    const { isValid, validate } = action.payload;
    return {
      ...state,
      isValid,
      validate,
    };
  }

  if (action.type === 'processorForm.close') {
    return {
      ...state,
      isValid: undefined,
      validate: () => Promise.resolve(true),
    };
  }

  return state;
};

export const useEditorState = (initialState: StateArg) =>
  useReducer<typeof reducer>(reducer, { ...initialState, validate: () => Promise.resolve(true) });
