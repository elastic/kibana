/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Reducer, useReducer } from 'react';
import { euiDragDropReorder } from '@elastic/eui';
import { produce } from 'immer';

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
  | { type: 'processorForm.update'; payload: OnFormUpdateArg<any> }
  | { type: 'processorForm.close' };

const addSelectorRoot = (path?: string[]) => {
  return ['processors'].concat(path ?? []);
};

export const reducer: Reducer<State, Action> = (state, action) =>
  produce(state, draft => {
    if (action.type === 'moveProcessor') {
      const { destination, source } = action.payload;

      if (source.selector.join('.') === destination.selector.join('.')) {
        const path = addSelectorRoot(source.selector);
        setValue(
          path,
          draft,
          euiDragDropReorder(getValue(path, draft), source.index, destination.index)
        );
      } else {
        // TODO: Implement
      }
      return;
    }

    if (action.type === 'removeProcessor') {
      const { selector } = action.payload;
      const pipeSelector = selector.slice(0, -1);
      const idx = parseInt(selector[selector.length - 1], 10);
      const processors = getValue<ProcessorInternal[]>(addSelectorRoot(pipeSelector), draft);
      processors.splice(idx, 1);
      return;
    }

    if (action.type === 'addProcessor') {
      const { processor, selector } = action.payload;
      const path = addSelectorRoot(selector);
      setValue(path, draft, getValue(path, draft).concat(processor));
      return;
    }

    if (action.type === 'addOnFailureProcessor') {
      const { onFailureProcessor, targetSelector } = action.payload;
      if (!targetSelector.length) {
        throw new Error('Expected target selector to contain a path, but received an empty array.');
      }
      const path = addSelectorRoot(targetSelector);
      const targetProcessor = getValue<ProcessorInternal>(path, draft);
      if (!targetProcessor) {
        throw new Error(`Could not find processor at ${path.join('.')}`);
      }
      targetProcessor.onFailure = targetProcessor.onFailure
        ? targetProcessor.onFailure.concat(onFailureProcessor)
        : [onFailureProcessor];
      return;
    }

    if (action.type === 'updateProcessor') {
      const { processor, selector } = action.payload;
      const path = addSelectorRoot(selector);
      const pipeSelector = path.slice(0, -1);
      const idx = parseInt(path[path.length - 1], 10);

      if (idx !== idx) {
        throw new Error(`Expected numeric value, received ${idx}`);
      }
      const processors = getValue<ProcessorInternal[]>(pipeSelector, draft);
      processors[idx] = processor;
      return;
    }

    if (action.type === 'processorForm.update') {
      Object.assign(draft, action.payload);
      return;
    }

    if (action.type === 'processorForm.close') {
      Object.assign(draft, { isValid: undefined, validate: () => Promise.resolve(true) });
      return;
    }
  });

export const useProcessorsState = (initialState: StateArg) =>
  useReducer<typeof reducer>(reducer, { ...initialState, validate: () => Promise.resolve(true) });
