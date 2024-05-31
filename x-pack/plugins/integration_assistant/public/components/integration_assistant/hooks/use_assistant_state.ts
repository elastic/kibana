/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useReducer } from 'react';
import type { IntegrationSettings } from '../types';

interface AssistantState {
  step: number;
  connectorId?: string;
  integrationSettings?: IntegrationSettings;
  isGenerating: boolean;
  result?: object; // TODO: type result properly
}

// const initialState: AssistantState = {
//   step: 1,
//   connectorId: undefined,
//   integrationSettings: undefined,
//   isGenerating: false,
//   result: undefined,
// };
const initialState: AssistantState = {
  step: 1,
  connectorId: undefined,
  integrationSettings: {
    title: 'My Integration',
    description: 'My manual integration description',
    dataStreamTitle: 'My data stream title',
    dataStreamDescription: 'My manual data stream description',
  },
  isGenerating: false,
  result: undefined,
};

type Action =
  | { type: 'SET_STEP'; payload: AssistantState['step'] }
  | { type: 'SET_CONNECTOR_ID'; payload: AssistantState['connectorId'] }
  | { type: 'SET_INTEGRATION_SETTINGS'; payload: AssistantState['integrationSettings'] }
  | { type: 'SET_IS_GENERATING'; payload: AssistantState['isGenerating'] }
  | { type: 'SET_GENERATED_RESULT'; payload: AssistantState['result'] };

const reducer = (state: AssistantState, action: Action): AssistantState => {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.payload };
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

export const useAssistantState = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = useMemo(
    () => ({
      setStep: (payload: AssistantState['step']) => {
        dispatch({ type: 'SET_STEP', payload });
      },
      setConnectorId: (payload: AssistantState['connectorId']) => {
        dispatch({ type: 'SET_CONNECTOR_ID', payload });
      },
      setIntegrationSettings: (payload: AssistantState['integrationSettings']) => {
        dispatch({ type: 'SET_INTEGRATION_SETTINGS', payload });
      },
      setIsGenerating: (payload: AssistantState['isGenerating']) => {
        dispatch({ type: 'SET_IS_GENERATING', payload });
      },
      setResult: (payload: AssistantState['result']) => {
        dispatch({ type: 'SET_GENERATED_RESULT', payload });
      },
    }),
    []
  );

  return { state, actions };
};
