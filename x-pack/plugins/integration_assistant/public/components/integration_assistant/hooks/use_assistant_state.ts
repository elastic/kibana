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
}

const initialState: AssistantState = {
  step: 1,
  connectorId: undefined,
  integrationSettings: undefined,
  isGenerating: false,
};

type Action =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_CONNECTOR_ID'; payload: string }
  | { type: 'SET_INTEGRATION_SETTINGS'; payload: IntegrationSettings }
  | { type: 'SET_IS_GENERATING'; payload: boolean };

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
    default:
      return state;
  }
};

export const useAssistantState = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = useMemo(
    () => ({
      setStep: (payload: number) => {
        dispatch({ type: 'SET_STEP', payload });
      },
      setConnectorId: (payload: string) => {
        dispatch({ type: 'SET_CONNECTOR_ID', payload });
      },
      setIntegrationSettings: (payload: IntegrationSettings) => {
        dispatch({ type: 'SET_INTEGRATION_SETTINGS', payload });
      },
      setIsGenerating: (payload: boolean) => {
        dispatch({ type: 'SET_IS_GENERATING', payload });
      },
    }),
    []
  );

  return { state, actions };
};
