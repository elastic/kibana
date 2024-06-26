/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createContext, useContext } from 'react';
import type { Pipeline, Docs } from '../../../../common';
import type { AIConnector, IntegrationSettings } from './types';

export interface State {
  step: number;
  connectorId?: AIConnector['id'];
  integrationSettings?: IntegrationSettings;
  isGenerating: boolean;
  result?: {
    pipeline: Pipeline;
    docs: Docs;
  };
}

export const initialState: State = {
  step: 1,
  connectorId: undefined,
  integrationSettings: undefined,
  isGenerating: false,
  result: undefined,
};

type Action =
  | { type: 'SET_STEP'; payload: State['step'] }
  | { type: 'SET_CONNECTOR_ID'; payload: State['connectorId'] }
  | { type: 'SET_INTEGRATION_SETTINGS'; payload: State['integrationSettings'] }
  | { type: 'SET_IS_GENERATING'; payload: State['isGenerating'] }
  | { type: 'SET_GENERATED_RESULT'; payload: State['result'] };

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_STEP':
      return {
        ...state,
        step: action.payload,
        isGenerating: false,
        ...(action.payload < state.step && { result: undefined }), // reset the result when we go back
      };
    case 'SET_CONNECTOR_ID':
      return { ...state, connectorId: action.payload };
    case 'SET_INTEGRATION_SETTINGS':
      return { ...state, integrationSettings: action.payload };
    case 'SET_IS_GENERATING':
      return { ...state, isGenerating: action.payload };
    case 'SET_GENERATED_RESULT':
      return { ...state, result: action.payload };
    default:
      return state;
  }
};

export interface Actions {
  setStep: (payload: State['step']) => void;
  setConnectorId: (payload: State['connectorId']) => void;
  setIntegrationSettings: (payload: State['integrationSettings']) => void;
  setIsGenerating: (payload: State['isGenerating']) => void;
  setResult: (payload: State['result']) => void;
}

const ActionsContext = createContext<Actions | undefined>(undefined);
export const ActionsProvider = ActionsContext.Provider;
export const useActions = () => {
  const actions = useContext(ActionsContext);
  if (!actions) {
    throw new Error('useActions must be used within a ActionsProvider');
  }
  return actions;
};
