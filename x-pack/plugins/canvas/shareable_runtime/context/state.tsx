/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext, Dispatch, useReducer, ReactChild } from 'react';
import { CanvasShareableState } from '../types';
import { reducer } from './reducer';
import { CanvasShareableAction } from './actions';

type StateType = [CanvasShareableState, Dispatch<CanvasShareableAction>];

/**
 * The initial state for the Canvas Shareable Runtime.
 */
export const initialCanvasShareableState: CanvasShareableState = {
  renderers: {},
  workpad: null,
  stage: {
    page: 0,
    height: 400,
    width: 600,
  },
  footer: {
    isScrubberVisible: false,
  },
  settings: {
    autoplay: {
      isEnabled: false,
      interval: '5s',
    },
    toolbar: {
      isAutohide: false,
    },
  },
  refs: {
    stage: React.createRef(),
  },
};

export const CanvasShareableContext = createContext<StateType>([
  initialCanvasShareableState,
  () => {},
]);

export const CanvasShareableStateProvider = ({
  initialState,
  children,
}: {
  initialState: CanvasShareableState;
  children: ReactChild;
}) => (
  <CanvasShareableContext.Provider value={useReducer(reducer, initialState)}>
    {children}
  </CanvasShareableContext.Provider>
);

export const useCanvasShareableState = () => useContext<StateType>(CanvasShareableContext);
