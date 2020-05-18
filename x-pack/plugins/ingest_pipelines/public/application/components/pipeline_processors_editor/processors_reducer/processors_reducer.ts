/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Reducer, useReducer, Dispatch } from 'react';
import { DeserializeResult } from '../deserialize';
import { unsafeProcessorMove } from './utils';
import { getValue, setValue } from '../utils';
import { ProcessorInternal, ProcessorSelector } from '../types';

export type State = Omit<DeserializeResult, 'onFailure'> & {
  onFailure: ProcessorInternal[];
  isRoot: true;
};

type Action =
  | {
      type: 'addTopLevelProcessor';
      payload: { processor: ProcessorInternal; selector: ProcessorSelector };
    }
  | {
      type: 'addOnFailureProcessor';
      payload: {
        onFailureProcessor: ProcessorInternal;
        targetSelector: ProcessorSelector;
      };
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
    const idx = parseInt(selector[selector.length - 1], 10);
    const processors = getValue<ProcessorInternal[]>(processorsSelector, state);
    processors.splice(idx, 1);
    if (!processors.length && selector.length) {
      return setValue(processorsSelector, state, undefined);
    }
    return setValue(processorsSelector, state, [...processors]);
  }

  if (action.type === 'addTopLevelProcessor') {
    const { processor, selector } = action.payload;
    return setValue(selector, state, getValue(selector, state).concat(processor));
  }

  if (action.type === 'addOnFailureProcessor') {
    const { onFailureProcessor, targetSelector } = action.payload;
    if (!targetSelector.length) {
      throw new Error('Expected target selector to contain a path, but received an empty array.');
    }
    const targetProcessor = getValue<ProcessorInternal>(targetSelector, state);
    if (!targetProcessor) {
      throw new Error(`Could not find processor at ${targetSelector.join('.')}`);
    }
    targetProcessor.onFailure = targetProcessor.onFailure
      ? targetProcessor.onFailure.concat(onFailureProcessor)
      : [onFailureProcessor];
    return setValue(targetSelector, state, targetProcessor);
  }

  if (action.type === 'updateProcessor') {
    const { processor, selector } = action.payload;
    const processorsSelector = selector.slice(0, -1);
    const idx = parseInt(selector[selector.length - 1], 10);

    if (idx !== idx) {
      throw new Error(`Expected numeric value, received ${idx}`);
    }

    const processors = getValue<ProcessorInternal[]>(processorsSelector, state);
    processors[idx] = processor;
    return setValue(processorsSelector, state, [...processors]);
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
