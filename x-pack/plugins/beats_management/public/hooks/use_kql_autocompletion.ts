/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useCallback, useState } from 'react';
import { AutocompleteSuggestion } from 'ui/autocomplete_providers';

interface HookState {
  // lacking cancellation support in the autocompletion api,
  // this is used to keep older, slower requests from clobbering newer ones
  currentRequest: {
    expression: string;
    cursorPosition: number;
  } | null;
  suggestions: AutocompleteSuggestion[];
}

interface HookProps {
  isLoadingSuggestions: boolean;
  isValid: boolean;
  value: string;
  suggestions: AutocompleteSuggestion[];
  loadSuggestions: (expression: string, cursorPosition: number, maxSuggestions?: number) => void;
}

export const useKQLAutocomplete = (
  getSuggestions: (
    kuery: string,
    selectionStart: any,
    fieldPrefix?: string
  ) => Promise<AutocompleteSuggestion[]>,
  isKueryValid: (kql: string) => boolean,
  value: string,
  fieldPrefix?: string
): HookProps => {
  const [state, setState] = useState<HookState>({
    currentRequest: null,
    suggestions: [],
  });

  const loadSuggestions = async (
    expression: string,
    cursorPosition: number,
    maxSuggestions?: number
  ) => {
    setState({
      currentRequest: {
        expression,
        cursorPosition,
      },
      suggestions: [],
    });
    let suggestions: any[] = [];
    try {
      suggestions = await getSuggestions(expression, cursorPosition, fieldPrefix);
    } catch (e) {
      suggestions = [];
    }

    if (
      !state.currentRequest ||
      state.currentRequest.expression === expression ||
      state.currentRequest.cursorPosition === cursorPosition
    ) {
      setState({
        ...state,
        currentRequest: null,
        suggestions: maxSuggestions ? suggestions.slice(0, maxSuggestions) : suggestions,
      });
    }
  };

  return {
    isLoadingSuggestions: state.currentRequest !== null,
    suggestions: state.suggestions,
    loadSuggestions: useCallback(
      (expression: string, cursorPosition: number, maxSuggestions?: number) => {
        loadSuggestions(expression, cursorPosition, maxSuggestions);
      },
      []
    ),
  };
};
