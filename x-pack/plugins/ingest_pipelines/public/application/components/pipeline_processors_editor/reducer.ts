/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Reducer, useReducer } from 'react';
import { euiDragDropReorder } from '@elastic/eui';

import { OnFormUpdateArg } from '../../../shared_imports';

import { DeserializeResult } from './data_in';
import { getValue, setValue } from './utils';
import { ProcessorInternal, DraggableLocation, ProcessorSelector } from './types';

type StateArg = DeserializeResult;

interface State extends StateArg {
  isValid?: boolean;
  validate: () => Promise<boolean>;
}

type Action =
  | {
      type: 'addProcessor';
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
    }
  // Does not quite belong here, but using in reducer for convenience
  | { type: 'processorForm.update'; payload: OnFormUpdateArg<any> }
  | { type: 'processorForm.close' };

const addSelectorRoot = (path?: string[]) => {
  return ['processors'].concat(path ?? []);
};

export const reducer: Reducer<State, Action> = (state, action) => {
  if (action.type === 'moveProcessor') {
    const { destination, source } = action.payload;

    if (source.selector.join('.') === destination.selector.join('.')) {
      const path = addSelectorRoot(source.selector);
      return setValue(
        path,
        state,
        euiDragDropReorder(getValue(path, state), source.index, destination.index)
      );
    } else {
      // TODO: Implement
      return state;
    }
  }

  if (action.type === 'removeProcessor') {
    const { selector } = action.payload;
    const path = addSelectorRoot(selector);
    const processorsSelector = path.slice(0, -1);
    const idx = parseInt(path[path.length - 1], 10);
    const processors = getValue<ProcessorInternal[]>(processorsSelector, state);
    processors.splice(idx, 1);
    if (!processors.length) {
      return setValue(processorsSelector, state, undefined);
    }
    return setValue(processorsSelector, state, processors);
  }

  if (action.type === 'addProcessor') {
    const { processor, selector } = action.payload;
    const path = addSelectorRoot(selector);
    return setValue(path, state, getValue(path, state).concat(processor));
  }

  if (action.type === 'addOnFailureProcessor') {
    const { onFailureProcessor, targetSelector } = action.payload;
    if (!targetSelector.length) {
      throw new Error('Expected target selector to contain a path, but received an empty array.');
    }
    const path = addSelectorRoot(targetSelector);
    const targetProcessor = getValue<ProcessorInternal>(path, state);
    if (!targetProcessor) {
      throw new Error(`Could not find processor at ${path.join('.')}`);
    }
    targetProcessor.onFailure = targetProcessor.onFailure
      ? targetProcessor.onFailure.concat(onFailureProcessor)
      : [onFailureProcessor];
    return setValue(path, state, targetProcessor);
  }

  if (action.type === 'updateProcessor') {
    const { processor, selector } = action.payload;
    const path = addSelectorRoot(selector);
    const processorsSelector = path.slice(0, -1);
    const idx = parseInt(path[path.length - 1], 10);

    if (idx !== idx) {
      throw new Error(`Expected numeric value, received ${idx}`);
    }
    const processors = getValue<ProcessorInternal[]>(processorsSelector, state);
    processors[idx] = processor;
    return setValue(processorsSelector, state, processors);
  }

  if (action.type === 'processorForm.update') {
    return { ...state, ...action.payload };
  }

  if (action.type === 'processorForm.close') {
    return { ...state, isValid: undefined, validate: () => Promise.resolve(true) };
  }

  return state;
};

export const useProcessorsState = (initialState: StateArg) =>
  useReducer<typeof reducer>(reducer, { ...initialState, validate: () => Promise.resolve(true) });
