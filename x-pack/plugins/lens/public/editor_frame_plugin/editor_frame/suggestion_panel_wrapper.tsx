/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Action } from '../state_management';
import { VisualizationSuggestion } from '../../types';

interface SuggestionPanelWrapperProps {
  suggestions: Array<VisualizationSuggestion & { visualizationId: string }>;
  dispatch: (action: Action) => void;
}

export function SuggestionPanelWrapper(props: SuggestionPanelWrapperProps) {
  return (
    <>
      <h2>Suggestions</h2>
      {(props.suggestions || []).map(suggestion => {
        return (
          <button
            onClick={() => {
              props.dispatch({
                type: 'SWITCH_VISUALIZATION',
                newVisulizationId: suggestion.visualizationId,
                initialState: suggestion.state,
              });
            }}
          >
            {suggestion.title}
          </button>
        );
      })}
    </>
  );
}
