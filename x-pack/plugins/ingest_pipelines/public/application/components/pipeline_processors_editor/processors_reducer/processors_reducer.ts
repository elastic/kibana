/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import uuid from 'uuid';
import { Reducer, useReducer, Dispatch } from 'react';
import { DeserializeResult } from '../deserialize';
import { getValue, setValue } from '../utils';
import { ProcessorInternal, ProcessorSelector } from '../types';

import { unsafeProcessorMove, duplicateProcessor } from './utils';

export type State = Omit<DeserializeResult, 'onFailure'> & {
  onFailure: ProcessorInternal[];
  isRoot: true;
};

export type Action =
  | {
      type: 'addProcessor';
      payload: { processor: Omit<ProcessorInternal, 'id'>; targetSelector: ProcessorSelector };
    }
  | {
      type: 'updateProcessor';
      payload: { processor: ProcessorInternal; selector: ProcessorSelector };
    }
  | {
      type: 'removeProcessor';
      payload: { selector: ProcessorSelector };
    }
  | {
      type: 'moveProcessor';
      payload: { source: ProcessorSelector; destination: ProcessorSelector };
    }
  | {
      type: 'duplicateProcessor';
      payload: {
        source: ProcessorSelector;
      };
    }
  | {
      type: 'loadProcessors';
      payload: {
        newState: DeserializeResult;
      };
    };

export type ProcessorsDispatch = Dispatch<Action>;

export const reducer: Reducer<State, Action> = (state, action) => {
  if (action.type === 'moveProcessor') {
    const { destination, source } = action.payload;
    try {
      return unsafeProcessorMove(state, source, destination);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return { ...state };
    }
  }

  if (action.type === 'removeProcessor') {
    const { selector } = action.payload;
    const processorsSelector = selector.slice(0, -1);
    const parentProcessorSelector = processorsSelector.slice(0, -1);
    const idx = parseInt(selector[selector.length - 1], 10);
    const processors = getValue<ProcessorInternal[]>(processorsSelector, state);
    processors.splice(idx, 1);
    const parentProcessor = getValue(parentProcessorSelector, state);
    if (!processors.length && selector.length && !(parentProcessor as State).isRoot) {
      return setValue(processorsSelector, state, undefined);
    }
    return setValue(processorsSelector, state, [...processors]);
  }

  if (action.type === 'addProcessor') {
    const { processor, targetSelector } = action.payload;
    if (!targetSelector.length) {
      throw new Error('Expected target selector to contain a path, but received an empty array.');
    }
    const targetProcessor = getValue<ProcessorInternal | ProcessorInternal[]>(
      targetSelector,
      state
    );
    if (!targetProcessor) {
      throw new Error(
        `Could not find processor or processors array at ${targetSelector.join('.')}`
      );
    }
    if (Array.isArray(targetProcessor)) {
      return setValue(
        targetSelector,
        state,
        targetProcessor.concat({ ...processor, id: uuid.v4() })
      );
    } else {
      const processorWithId = { ...processor, id: uuid.v4() };
      targetProcessor.onFailure = targetProcessor.onFailure
        ? targetProcessor.onFailure.concat(processorWithId)
        : [processorWithId];
      return setValue(targetSelector, state, targetProcessor);
    }
  }

  if (action.type === 'updateProcessor') {
    const { processor, selector } = action.payload;
    const processorsSelector = selector.slice(0, -1);
    const idx = parseInt(selector[selector.length - 1], 10);

    if (isNaN(idx)) {
      throw new Error(`Expected numeric value, received ${idx}`);
    }

    const processors = getValue<ProcessorInternal[]>(processorsSelector, state);
    processors[idx] = processor;
    return setValue(processorsSelector, state, [...processors]);
  }

  if (action.type === 'duplicateProcessor') {
    const sourceSelector = action.payload.source;
    const sourceProcessor = getValue<ProcessorInternal>(sourceSelector, state);
    const sourceIdx = parseInt(sourceSelector[sourceSelector.length - 1], 10);
    const sourceProcessorsArraySelector = sourceSelector.slice(0, -1);
    const sourceProcessorsArray = [
      ...getValue<ProcessorInternal[]>(sourceProcessorsArraySelector, state),
    ];
    const copy = duplicateProcessor(sourceProcessor);
    sourceProcessorsArray.splice(sourceIdx + 1, 0, copy);
    return setValue(sourceProcessorsArraySelector, state, sourceProcessorsArray);
  }

  if (action.type === 'loadProcessors') {
    return {
      ...action.payload.newState,
      onFailure: action.payload.newState.onFailure ?? [],
      isRoot: true,
    };
  }

  return state;
};

export const useProcessorsState = (initialState: DeserializeResult) => {
  const state = {
    ...initialState,
    onFailure: initialState.onFailure ?? [],
  };
  return useReducer<typeof reducer>(reducer, { ...state, isRoot: true });
};
