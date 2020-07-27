/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useReducer, createContext, useContext } from 'react';

import { reducer } from './reducer';
import { State, Dispatch } from './types';

const StateContext = createContext<State | undefined>(undefined);
const DispatchContext = createContext<Dispatch | undefined>(undefined);

export const StateProvider: React.FC = ({ children }) => {
  const initialState: State = {
    isValid: true,
    configuration: {
      defaultValue: {},
      data: {
        raw: {},
        format: () => ({}),
      },
      validate: () => Promise.resolve(true),
    },
    templates: {
      defaultValue: {},
      data: {
        raw: {},
        format: () => ({}),
      },
      validate: () => Promise.resolve(true),
    },
    fields: {
      byId: {},
      rootLevelFields: [],
      aliases: {},
      maxNestedDepth: 0,
    },
    documentFields: {
      status: 'idle',
      editor: 'default',
    },
    fieldsJsonEditor: {
      format: () => ({}),
      isValid: true,
    },
    search: {
      term: '',
      result: [],
    },
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  );
};

export const useMappingsState = () => {
  const ctx = useContext(StateContext);
  if (ctx === undefined) {
    throw new Error('useMappingsState must be used within a <MappingsState>');
  }
  return ctx;
};

export const useDispatch = () => {
  const ctx = useContext(DispatchContext);
  if (ctx === undefined) {
    throw new Error('useDispatch must be used within a <MappingsState>');
  }
  return ctx;
};
