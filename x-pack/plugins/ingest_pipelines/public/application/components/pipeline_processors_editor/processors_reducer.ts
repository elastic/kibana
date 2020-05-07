/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Reducer, useReducer } from 'react';
import { euiDragDropReorder } from '@elastic/eui';

import { DeserializeResult } from './serialize';
import { getValue, setValue, unsafeProcessorMove, PARENT_CHILD_NEST_ERROR } from './utils';
import { ProcessorInternal, DraggableLocation, ProcessorSelector } from './types';

export type State = DeserializeResult;

type Action =
  | {
      type: 'addTopLevelProcessor';
      payload: { processor: Omit<ProcessorInternal, 'id'>; selector: ProcessorSelector };
    }
  | {
      type: 'addOnFailureProcessor';
      payload: {
        onFailureProcessor: Omit<ProcessorInternal, 'id'>;
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
      payload: { source: DraggableLocation; destination: DraggableLocation };
    };

export const reducer: Reducer<State, Action> = (state, action) => {
  if (action.type === 'moveProcessor') {
    const { destination, source } = action.payload;
    if (source.selector.join('.') === destination.selector.join('.')) {
      const selector = source.selector;
      return setValue(
        selector,
        state,
        euiDragDropReorder(getValue(selector, state), source.index, destination.index)
      );
    } else {
      try {
        return unsafeProcessorMove(state, source, destination);
      } catch (e) {
        if (e.message === PARENT_CHILD_NEST_ERROR) {
          return { ...state };
        }
      }
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

export const useProcessorsState = (initialState: State) =>
  useReducer<typeof reducer>(reducer, { ...initialState });
